import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiKey } from './apiKeys'
import { cardNumberMatches, setMatches } from './priceMatch'

// ============================================================================
// Integración TCGAPI (https://tcgapi.dev) — precios universales de 89+ juegos.
// Requiere API key (X-API-Key: …), guardada vía lib/apiKeys.ts.
//
// CUOTA: el plan gratuito permite 100 requests/DÍA. Este guard aplica un
// presupuesto con margen de seguridad:
//   - En memoria (siempre activo): ventana deslizante de 24h, tope 90/día.
//   - En base (integration_usage, si la tabla existe): contador por día UTC
//     persistente entre reinicios/instancias.
// Cualquier llamada por encima del presupuesto se descarta (devuelve null) y
// la cadena de fallback sigue sin consumir cuota.
// ============================================================================

const TCGAPI_BASE = 'https://api.tcgapi.dev'

const DAILY_LIMIT = 100
const SAFETY_MARGIN = 10
const DAILY_BUDGET = DAILY_LIMIT - SAFETY_MARGIN
const WINDOW_MS = 24 * 60 * 60 * 1000
const USAGE_INTEGRATION = 'tcg_api'

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

export function tcgApiBudget(): {
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

export async function getTcgApiKey(): Promise<string | null> {
  return getApiKey('tcgapi_key')
}

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<{ ok: true; data: T; rateLimit?: Record<string, unknown> } | { ok: false; detail: string }> {
  const key = await getTcgApiKey()
  if (!key) return { ok: false, detail: 'No hay API key configurada' }

  if (!(await budgetAvailable())) {
    return { ok: false, detail: 'Cuota diaria agotada (TCGAPI)' }
  }

  const url = new URL(`${TCGAPI_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { 'X-API-Key': key },
    })

    if (res.status === 429) {
      return { ok: false, detail: 'Rate limit de TCGAPI alcanzado (429)' }
    }
    if (!res.ok) {
      return { ok: false, detail: `HTTP ${res.status}: ${res.statusText}` }
    }

    await consumeBudget()
    const body = await res.json()
    return {
      ok: true,
      data: body.data ?? body,
      rateLimit: body.rateLimit ?? body.rate_limit
    }
  } catch (err) {
    return {
      ok: false,
      detail: `Error de red: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

// ── Tipos de respuesta ────────────────────────────────────────────────────

export interface TcgApiCard {
  id: number
  name: string
  set: string
  set_name?: string
  number?: string
  rarity?: string
  price?: number
  low_price?: number
  foil_price?: number
  price_change_7d?: number
  total_listings?: number
  game?: string
}

export interface TcgApiPrice {
  market_price: number
  low_price?: number
  foil_price?: number
  printing?: string
}

export interface TcgApiSearchResult {
  cards: TcgApiCard[]
  total: number
}

// ── Búsqueda de cartas ────────────────────────────────────────────────────

/**
 * Busca cartas por nombre en TCGAPI. Ideal como fallback de precios
 * cuando TCGdex no tiene valor.
 *
 * @param opts.cardName - Nombre de la carta (búsqueda fuzzy)
 * @param opts.number   - Número de la carta (opcional, para filtrar)
 * @param opts.game     - Juego (default: 'pokemon')
 */
export async function tcgApiSearch(opts: {
  cardName: string
  number?: string
  set?: string | null
  game?: string
}): Promise<TcgApiPrice | null> {
  const params: Record<string, string> = {
    q: opts.cardName,
    game: opts.game ?? 'pokemon',
    per_page: '10'
  }

  const result = await apiFetch<{ data: TcgApiCard[]; pagination?: { total: number } }>(
    '/v1/search',
    params
  )

  if (!result.ok || !result.data?.data?.length) return null

  let cards = result.data.data

  // Solo aceptar cartas que coincidan con el número buscado. Si no hay
  // impresión exacta, no tomar el precio de una carta homónima de otro set
  // (p. ej. una Victini cara de otro set para una promo 05/15).
  if (opts.number) {
    const byNumber = cards.filter((c) => cardNumberMatches(opts.number, c.number))
    if (byNumber.length === 0) return null
    cards = byNumber
  }

  // Preferir resultados del set buscado cuando el proveedor lo informa.
  if (opts.set) {
    const bySet = cards.filter((c) => setMatches(opts.set, { code: c.set, name: c.set_name }))
    if (bySet.length > 0) cards = bySet
  }

  const best = cards[0]
  if (!best || best.price == null) return null

  return {
    market_price: best.price,
    low_price: best.low_price ?? undefined,
    foil_price: best.foil_price ?? undefined
  }
}

// ── Test de conexión ──────────────────────────────────────────────────────

export async function tcgApiTest(): Promise<{
  ok: boolean
  detail?: string
  budget?: { used: number; limit: number; remaining: number }
}> {
  const key = await getTcgApiKey()
  if (!key) {
    return { ok: false, detail: 'No hay API key configurada (ni env var ni DB)' }
  }

  const result = await apiFetch<{ data: TcgApiCard[] }>(
    '/v1/search',
    { q: 'pikachu', game: 'pokemon', per_page: '1' }
  )

  const budget = tcgApiBudget()

  if (!result.ok) {
    return { ok: false, detail: result.detail, budget }
  }

  const count = result.data?.data?.length ?? 0
  return {
    ok: true,
    detail: `Conexión OK · ${count} resultado(s) para "pikachu" · Cuota: ${budget.used}/${budget.limit}`,
    budget
  }
}
