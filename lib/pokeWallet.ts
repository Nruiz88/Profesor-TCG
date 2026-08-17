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
// key, falla el request, hay error de auth o no encuentra precio.
export async function pokeWalletSearch(opts: {
  cardName: string
  number?: string
  key?: string | null
}): Promise<PokeWalletPrice | null> {
  const key = opts.key ?? (await getPokeWalletKey())
  if (!key) return null

  const q = [opts.cardName, opts.number].filter(Boolean).join(' ')
  try {
    const res = await fetch(`${POKEWALLET_BASE}/search?q=${encodeURIComponent(q)}&limit=10`, {
      headers: {
        'X-API-Key': key,
        'User-Agent': 'profesortcg/1.0'
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

// Prueba de conexión para el panel admin (usa la clave configurada).
export async function pokeWalletTest(): Promise<{ ok: boolean; detail: string }> {
  const key = await getPokeWalletKey()
  if (!key) return { ok: false, detail: 'No hay clave configurada' }
  try {
    const res = await fetch(`${POKEWALLET_BASE}/search?q=pikachu&limit=1`, {
      headers: { 'X-API-Key': key, 'User-Agent': 'profesortcg/1.0' },
      cache: 'no-store'
    })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, detail: 'Clave inválida (401/403)' }
    }
    if (res.status === 429) return { ok: false, detail: 'Cuota de PokeWallet excedida (429)' }
    if (!res.ok) return { ok: false, detail: `PokeWallet respondió ${res.status}` }
    return { ok: true, detail: 'Conexión OK: la API responde con la clave configurada' }
  } catch {
    return { ok: false, detail: 'No se pudo contactar a PokeWallet' }
  }
}
