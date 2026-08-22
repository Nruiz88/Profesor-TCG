import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiKey } from './apiKeys'
import { cardNumberMatches, setMatches } from './priceMatch'

// ============================================================================
// Integración PokéTrace (https://poketrace.com) — precios de TCGPlayer, eBay
// y CardMarket en una sola API. Requiere API key (X-API-Key: …), guardada
// de forma segura vía lib/apiKeys.ts (env var o app_settings).
//
// CUOTA: el plan gratuito permite 250 requests/DÍA. Este guard aplica un
// presupuesto con margen de seguridad:
//   - En memoria (siempre activo): ventana deslizante de 24h, tope 230/día.
//   - En base (integration_usage, si la tabla existe): contador por día UTC
//     persistente entre reinicios/instancias.
// Cualquier llamada por encima del presupuesto se descarta (devuelve null) y
// la cadena de fallback sigue sin consumir cuota.
// ============================================================================

const POKETRACE_BASE = 'https://api.poketrace.com'

const DAILY_LIMIT = 250
const SAFETY_MARGIN = 20
const DAILY_BUDGET = DAILY_LIMIT - SAFETY_MARGIN
const WINDOW_MS = 24 * 60 * 60 * 1000
const USAGE_INTEGRATION = 'poke_trace'

// ── Cuota en memoria ──────────────────────────────────────────────────────
let requestTimes: number[] = []

export function pruneRequestTimes(
  times: number[],
  now: number,
  windowMs: number = WINDOW_MS
): number[] {
  const cutoff = now - windowMs
  return times.filter((t) => t >= cutoff)
}

function memoryUsage(): number {
  requestTimes = pruneRequestTimes(requestTimes, Date.now())
  return requestTimes.length
}

export function pokeTraceBudget(): {
  used: number
  limit: number
  remaining: number
} {
  const used = memoryUsage()
  return {
    used,
    limit: DAILY_BUDGET,
    remaining: Math.max(0, DAILY_BUDGET - used)
  }
}

// ── Cuota persistente en DB ───────────────────────────────────────────────
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

function dayBucket(now: number): string {
  return new Date(now).toISOString().slice(0, 10) // YYYY-MM-DD
}

async function dbUsage(): Promise<number | null> {
  const client = adminClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('integration_usage')
      .select('count')
      .eq('integration', USAGE_INTEGRATION)
      .eq('bucket', dayBucket(Date.now()))
      .maybeSingle()
    if (error) throw error
    return data?.count ?? 0
  } catch {
    return null
  }
}

async function dbIncrement(): Promise<void> {
  const client = adminClient()
  if (!client) return
  try {
    const bucket = dayBucket(Date.now())
    const { data } = await client
      .from('integration_usage')
      .select('count')
      .eq('integration', USAGE_INTEGRATION)
      .eq('bucket', bucket)
      .maybeSingle()
    const next = (data?.count ?? 0) + 1
    await client.from('integration_usage').upsert(
      { integration: USAGE_INTEGRATION, bucket, count: next },
      { onConflict: 'integration,bucket' }
    )
  } catch {
    // sin persistencia: el guard en memoria sigue activo
  }
}

async function budgetAvailable(): Promise<boolean> {
  if (memoryUsage() >= DAILY_BUDGET) return false
  const db = await dbUsage()
  if (db !== null && db >= DAILY_BUDGET) return false
  return true
}

async function consumeBudget(): Promise<void> {
  requestTimes.push(Date.now())
  await dbIncrement()
}

// ── API client ────────────────────────────────────────────────────────────

export async function getPokeTraceKey(): Promise<string | null> {
  return getApiKey('poketrace_key')
}

// ── Tipos de respuesta ────────────────────────────────────────────────────

export interface PokeTracePriceCondition {
  avg: number
  low: number
  high: number
  saleCount?: number
}

export interface PokeTracePrices {
  [source: string]: {
    [condition: string]: PokeTracePriceCondition
  }
}

export interface PokeTraceCard {
  id: string
  name: string
  cardNumber: string
  set: { slug: string; name: string }
  variant: string
  rarity: string
  productType: string
  productFamily: string
  image: string
  game: string
  market: string
  currency: string
  refs: { tcgplayerId: string | null; cardmarketId: string | null }
  prices: PokeTracePrices
  lastUpdated: string
}

export interface PokeTraceSearchResponse {
  data: PokeTraceCard[]
  pagination: {
    hasMore: boolean
    nextCursor: string | null
    count: number
  }
}

export interface PokeTracePriceResult {
  price: number
  source: 'tcgplayer' | 'ebay' | 'cardmarket'
  condition: string
  low?: number
  high?: number
  saleCount?: number
  currency: string
}

interface ApiOk<T> {
  ok: true
  data: T
  rateLimit?: Record<string, unknown>
}

interface ApiErr {
  ok: false
  detail: string
}

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<ApiOk<T> | ApiErr> {
  const key = await getPokeTraceKey()
  if (!key) return { ok: false, detail: 'No hay API key configurada' }

  if (!(await budgetAvailable())) {
    return { ok: false, detail: 'Cuota diaria agotada (PokéTrace)' }
  }

  const url = new URL(`${POKETRACE_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-API-Key': key }
    })

    if (res.status === 429) {
      return { ok: false, detail: 'Rate limit de PokéTrace alcanzado (429)' }
    }
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}: ${res.statusText}` }
    }

    await consumeBudget()
    const body = await res.json()
    return {
      ok: true,
      data: body,
      rateLimit: body.rateLimit ?? body.rate_limit
    }
  } catch (err) {
    return {
      ok: false,
      detail: `Error de red: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

// ── Funciones de negocio ──────────────────────────────────────────────────

// Ranking de condiciones: preferimos NEAR_MINT sobre otras
const CONDITION_RANK: Record<string, number> = {
  NEAR_MINT: 0,
  MINT: 1,
  EXCELLENT: 2,
  GOOD: 3,
  LIGHT_PLAY: 4,
  MODERATE_PLAY: 5,
  POOR: 6,
  DAMAGED: 7
}

function conditionRank(cond: string): number {
  return CONDITION_RANK[cond] ?? 50
}

// Prioridad de fuentes: TCGplayer > eBay > CardMarket
const SOURCE_RANK: Record<string, number> = {
  tcgplayer: 0,
  ebay: 1,
  cardmarket: 2
}

function sourceRank(src: string): number {
  return SOURCE_RANK[src] ?? 90
}

/**
 * Extrae el mejor precio de una carta de PokéTrace, priorizando
 * TCGplayer > eBay > CardMarket y NEAR_MINT sobre otras condiciones.
 */
export function bestPokeTracePrice(card: PokeTraceCard): PokeTracePriceResult | null {
  let best: PokeTracePriceResult | null = null

  for (const [source, conditions] of Object.entries(card.prices)) {
    for (const [condition, data] of Object.entries(conditions)) {
      const price = data.avg ?? data.low ?? null
      if (price == null) continue

      const sRank = sourceRank(source)
      const cRank = conditionRank(condition)

      if (
        !best ||
        sRank < sourceRank(best.source) ||
        (sRank === sourceRank(best.source) && cRank < conditionRank(best.condition))
      ) {
        best = {
          price,
          source: source as PokeTracePriceResult['source'],
          condition,
          low: data.low,
          high: data.high,
          saleCount: data.saleCount,
          currency: card.currency
        }
      }
    }
  }

  return best
}

/**
 * Busca cartas por nombre en PokéTrace. Devuelve el mejor precio encontrado
 * o null si no hay key, la cuota está agotada o no hay resultados.
 */
export async function pokeTraceSearch(opts: {
  cardName: string
  number?: string
  set?: string | null
  market?: string
}): Promise<PokeTracePriceResult | null> {
  const params: Record<string, string> = {
    search: opts.cardName,
    limit: '5'
  }
  if (opts.market) params.market = opts.market

  const result = await apiFetch<PokeTraceSearchResponse>(
    '/v1/cards',
    params
  )

  if (!result.ok || !result.data?.data?.length) return null

  let cards = result.data.data

  // Solo aceptar cartas que coincidan con el número buscado. Si el proveedor
  // no tiene esa impresión exacta, no tomar el precio de una carta homónima
  // de otro set (p. ej. una Victini cara de otro set para una promo 05/15).
  if (opts.number) {
    const byNumber = cards.filter((c) => cardNumberMatches(opts.number, c.cardNumber))
    if (byNumber.length === 0) return null
    cards = byNumber
  }

  // Preferir resultados del set buscado cuando el proveedor lo informa.
  if (opts.set) {
    const bySet = cards.filter((c) =>
      setMatches(opts.set, { code: c.set?.slug, name: c.set?.name })
    )
    if (bySet.length > 0) cards = bySet
  }

  // Buscar el mejor precio entre todas las cartas encontradas
  let bestOverall: PokeTracePriceResult | null = null
  for (const card of cards) {
    const price = bestPokeTracePrice(card)
    if (!price) continue
    if (!bestOverall || sourceRank(price.source) < sourceRank(bestOverall.source)) {
      bestOverall = price
    }
  }

  return bestOverall
}

/**
 * Busca una carta por ID exacto en PokéTrace.
 */
export async function pokeTraceCardById(
  id: string
): Promise<PokeTraceCard | null> {
  const result = await apiFetch<PokeTraceCard>(`/v1/cards/${id}`)
  if (!result.ok) return null
  return result.data
}

/**
 * Obtiene el historial de precios para una carta y tier específico.
 */
export async function pokeTracePriceHistory(
  cardId: string,
  tier: string
): Promise<unknown[] | null> {
  const result = await apiFetch<{ data: unknown[] }>(
    `/v1/cards/${cardId}/prices/${tier}/history`
  )
  if (!result.ok) return null
  return result.data?.data ?? null
}

// ── Test de conexión ──────────────────────────────────────────────────────

export async function pokeTraceTest(): Promise<{
  ok: boolean
  detail?: string
  budget?: { used: number; limit: number; remaining: number }
}> {
  const key = await getPokeTraceKey()
  if (!key) {
    return {
      ok: false,
      detail: 'No hay API key configurada (ni env var ni DB)',
      budget: pokeTraceBudget()
    }
  }

  const result = await apiFetch<PokeTraceSearchResponse>(
    '/v1/cards',
    { search: 'charizard', limit: '1' }
  )

  const budget = pokeTraceBudget()

  if (!result.ok) {
    return { ok: false, detail: result.detail, budget }
  }

  const count = result.data?.data?.length ?? 0
  return {
    ok: true,
    detail: `Conexión OK · ${count} resultado(s) para "charizard" · Cuota: ${budget.used}/${budget.limit}`,
    budget
  }
}
