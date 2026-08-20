import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getApiKey } from './apiKeys'

// ============================================================================
// Integración PokeWallet (https://pokewallet.io) — precios en tiempo real de
// TCGPlayer + CardMarket. Requiere API key (X-API-Key: pk_live_… / pk_test_…),
// guardada de forma segura vía lib/apiKeys.ts (env var o app_settings).
//
// Uso: fuente de respaldo de precios cuando TCGdex no tiene valor. Respeta el
// formato de respuesta del API (docs: https://pokewallet.io/api-docs).
// ============================================================================

const POKEWALLET_BASE = 'https://api.pokewallet.io'

// ============================================================================
// CUOTA: el plan gratuito de PokeWallet permite 100 pedidos/hora y NO se puede
// superar. Este guard aplica un presupuesto con margen de seguridad:
//   - En memoria (siempre activo): ventana deslizante de 1h, tope 90/h.
//   - En base (integration_usage, si la tabla existe): contador por hora UTC
//     persistente entre reinicios/instancias.
// Cualquier llamada por encima del presupuesto se descarta (devuelve null) y
// la cadena de fallback sigue con TCGdex / null sin consumir cuota.
// ============================================================================
const POKEWALLET_HOURLY_LIMIT = 100
const POKEWALLET_SAFETY_MARGIN = 10
const POKEWALLET_BUDGET = POKEWALLET_HOURLY_LIMIT - POKEWALLET_SAFETY_MARGIN
const WINDOW_MS = 60 * 60 * 1000
const USAGE_INTEGRATION = 'poke_wallet'

// Ventana deslizante en memoria (por instancia del servidor)
let requestTimes: number[] = []

// Helper puro (testeable): descarta timestamps fuera de la ventana y cuenta.
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

// Presupuesto actual de la cuota (en memoria).
export function pokeWalletBudget(): {
  used: number
  limit: number
  remaining: number
} {
  const used = memoryUsage()
  return {
    used,
    limit: POKEWALLET_BUDGET,
    remaining: Math.max(0, POKEWALLET_BUDGET - used)
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

function hourBucket(now: number): string {
  return new Date(now).toISOString().slice(0, 13)
}

// Conteo persistente en base para la hora actual (null si la tabla no existe)
async function dbUsage(): Promise<number | null> {
  const client = adminClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('integration_usage')
      .select('count')
      .eq('integration', USAGE_INTEGRATION)
      .eq('bucket', hourBucket(Date.now()))
      .maybeSingle()
    if (error) throw error
    return data?.count ?? 0
  } catch {
    return null
  }
}

// Incrementa el contador persistente (best-effort: sin tabla no hace nada;
// sin ella, el guard en memoria sigue activo)
async function dbIncrement(): Promise<void> {
  const client = adminClient()
  if (!client) return
  try {
    const bucket = hourBucket(Date.now())
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

// ¿Hay presupuesto disponible? Revisa memoria + base (si existe).
async function budgetAvailable(): Promise<boolean> {
  if (memoryUsage() >= POKEWALLET_BUDGET) return false
  const db = await dbUsage()
  if (db !== null && db >= POKEWALLET_BUDGET) return false
  return true
}

// Reserva una llamada del presupuesto (memoria + base).
async function consumeBudget(): Promise<void> {
  requestTimes.push(Date.now())
  await dbIncrement()
}

interface PokeWalletPrices {
  sub_type_name?: string
  variant_type?: string
  market_price?: number | null
  mid_price?: number | null
  low_price?: number | null
  avg?: number | null
  trend?: number | null
  low?: number | null
}

interface PokeWalletResult {
  id?: string
  card_info?: {
    name?: string
    clean_name?: string
    set_name?: string
    set_code?: string
    card_number?: string
  }
  tcgplayer?: {
    url?: string
    prices?: PokeWalletPrices[]
  } | null
  cardmarket?: {
    product_url?: string
    prices?: PokeWalletPrices[]
  } | null
}

export interface PokeWalletPrice {
  price: number
  source: 'tcgplayer' | 'cardmarket'
  tcgplayerUrl?: string | null
  cardmarketUrl?: string | null
}

// La clave se lee en el servidor (env var con prioridad, luego app_settings).
export async function getPokeWalletKey(): Promise<string | null> {
  return getApiKey('pokewallet_api_key')
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

// Prioridad de variantes TCGplayer (el mercado de la carta según su versión)
const TCG_VARIANT_RANK: Record<string, number> = {
  Holofoil: 0,
  'Reverse Holofoil': 1,
  Normal: 2,
  '1st Edition': 3,
  Unlimited: 4,
  Shadowless: 5
}

function tcgRank(name?: string): number {
  if (!name) return 99
  return TCG_VARIANT_RANK[name] ?? 90
}

// Mejor precio TCGplayer del set de resultados (por prioridad de variante)
function bestTcgPrice(results: PokeWalletResult[]): PokeWalletPrice | null {
  let best: { rank: number; price: number; url?: string | null } | null = null
  for (const r of results) {
    const prices = r.tcgplayer?.prices ?? []
    for (const p of prices) {
      const price = p.market_price ?? p.mid_price ?? p.low_price ?? null
      if (price == null) continue
      const rank = tcgRank(p.sub_type_name)
      if (!best || rank < best.rank) {
        best = { rank, price, url: r.tcgplayer?.url ?? null }
      }
    }
  }
  return best ? { price: best.price, source: 'tcgplayer', tcgplayerUrl: best.url } : null
}

// Mejor precio CardMarket (variante holo tiene prioridad)
function bestCardmarketPrice(results: PokeWalletResult[]): PokeWalletPrice | null {
  let best: { holo: boolean; price: number; url?: string | null } | null = null
  for (const r of results) {
    const prices = r.cardmarket?.prices ?? []
    for (const p of prices) {
      const price = p.avg ?? p.trend ?? p.low ?? null
      if (price == null) continue
      const holo = (p.variant_type ?? '').toLowerCase() === 'holo'
      if (!best || (holo && !best.holo)) {
        best = { holo, price, url: r.cardmarket?.product_url ?? null }
      }
    }
  }
  return best ? { price: best.price, source: 'cardmarket', cardmarketUrl: best.url } : null
}

// Busca el precio de una carta por nombre (+ número). Devuelve null si no hay
// key, falla el request, hay error de auth, el presupuesto de cuota está
// agotado o no encuentra precio.
export async function pokeWalletSearch(opts: {
  cardName: string
  number?: string
  key?: string | null
}): Promise<PokeWalletPrice | null> {
  const key = opts.key ?? (await getPokeWalletKey())
  if (!key) return null

  // CUOTA: si no hay presupuesto, no se consulta PokeWallet (falla silencioso)
  if (!(await budgetAvailable())) return null

  const q = [opts.cardName, opts.number].filter(Boolean).join(' ')
  try {
    await consumeBudget() // reserva la llamada antes del fetch
    const res = await fetch(`${POKEWALLET_BASE}/search?q=${encodeURIComponent(q)}&limit=10`, {
      headers: {
        'X-API-Key': key,
        'User-Agent': 'tcgclaim/1.0'
      },
      cache: 'no-store'
    })
    // Errores de auth o cuota: no hay nada que hacer, fallamos silencioso
    if (res.status === 401 || res.status === 403 || res.status === 429) return null
    if (!res.ok) return null

    const json = (await res.json()) as { results?: PokeWalletResult[] }
    const results = json.results ?? []
    if (results.length === 0) return null

    // Preferimos resultados cuyo nombre coincida con la carta buscada para no
    // tomar una carta homónima de otro set.
    const nName = normalize(opts.cardName)
    const exact = results.filter((r) => {
      const n = normalize(r.card_info?.clean_name ?? r.card_info?.name ?? '')
      return n.includes(nName) || nName.includes(n)
    })
    const pool = exact.length > 0 ? exact : results

    return bestTcgPrice(pool) ?? bestCardmarketPrice(pool)
  } catch {
    return null
  }
}

// Prueba de conexión para el panel admin (usa la clave configurada y también
// consume presupuesto: una prueba es un pedido real a la API).
export async function pokeWalletTest(): Promise<{
  ok: boolean
  detail: string
  budget: { used: number; limit: number; remaining: number }
}> {
  const budget = pokeWalletBudget()
  const key = await getPokeWalletKey()
  if (!key) return { ok: false, detail: 'No hay clave configurada', budget }
  if (!(await budgetAvailable())) {
    return {
      ok: false,
      detail: 'Presupuesto de PokeWallet agotado por esta hora (se reanuda en la próxima hora).',
      budget
    }
  }
  try {
    await consumeBudget()
    const res = await fetch(`${POKEWALLET_BASE}/search?q=pikachu&limit=1`, {
      headers: { 'X-API-Key': key, 'User-Agent': 'tcgclaim/1.0' },
      cache: 'no-store'
    })
    const after = pokeWalletBudget()
    if (res.status === 401 || res.status === 403) {
      return { ok: false, detail: 'Clave inválida (401/403)', budget: after }
    }
    if (res.status === 429) {
      return { ok: false, detail: 'Cuota de PokeWallet excedida (429)', budget: after }
    }
    if (!res.ok) return { ok: false, detail: `PokeWallet respondió ${res.status}`, budget: after }
    return {
      ok: true,
      detail: 'Conexión OK: la API responde con la clave configurada',
      budget: after
    }
  } catch {
    return { ok: false, detail: 'No se pudo contactar a PokeWallet', budget: pokeWalletBudget() }
  }
}
