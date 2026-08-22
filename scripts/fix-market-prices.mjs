// ============================================================================
// fix-market-prices.mjs — Re-resuelve y corrige los precios de mercado
// guardados en la base (binder_cards.market_price + caché card_prices).
//
// MOTIVACIÓN: la cadena de fallback de precios (PokeWallet/PokéTrace/TCGAPI)
// buscaba por nombre sin verificar set/número, y podía atribuirle a una carta
// el precio de una impresión homónima de OTRO set (p. ej. una Victini cara de
// SV: Black Bolt para una promo de McDonald's 05/15). Este script vuelve a
// resolver cada precio con el criterio corregido de src/lib/priceMatch.ts:
// solo se acepta la impresión exacta (número + set).
//
// FUENTES (en orden, igual que /api/binder/update-prices):
//   1. TCGdex por card_id (exacto, gratis, sin cuota)
//   2. PokeWallet  → fallback con número/set exacto
//   3. PokéTrace   → fallback con número/set exacto
//   4. TCGAPI      → fallback con número/set exacto
//
// USO:
//   node scripts/fix-market-prices.mjs            # DRY RUN: solo reporta
//   node scripts/fix-market-prices.mjs --apply    # escribe en la base
//   node scripts/fix-market-prices.mjs --only mcd22-5
//   node scripts/fix-market-prices.mjs --limit 50
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Las claves de las fuentes de respaldo se leen primero de env vars y luego de
// la tabla app_settings (igual que src/lib/apiKeys.ts). Sin clave, esa fuente
// se saltea y la cadena continúa.
// ============================================================================

import { readFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Argumentos ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
function flagValue(flag, fallback = '') {
  const eq = args.find((a) => a.startsWith(`${flag}=`))
  if (eq) return eq.slice(flag.length + 1)
  const i = args.indexOf(flag)
  if (i >= 0 && i + 1 < args.length && !args[i + 1].startsWith('--')) return args[i + 1]
  return fallback
}
const ONLY = flagValue('--only')
const LIMIT = parseInt(flagValue('--limit', '0'), 10) || 0

// ── Configuración de cuotas (misma lógica que las libs) ────────────────────
const QUOTAS = {
  pokewallet: { used: 0, limit: 90 },   // 100/h - margen de seguridad
  poketrace: { used: 0, limit: 230 },   // 250/d - margen de seguridad
  tcgapi: { used: 0, limit: 90 }        // 100/d - margen de seguridad
}

function quotaOk(name) {
  const q = QUOTAS[name]
  return q.used < q.limit
}

// ── Carga de .env.local (sin dependencias) ─────────────────────────────────
function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(join(ROOT, '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!m) continue
      env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
    }
  } catch {}
  return env
}

const ENV = loadEnv()
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

// ── Coincidencia exacta (espejo de src/lib/priceMatch.ts) ──────────────────
function normalizeCardNumber(value) {
  if (!value) return ''
  const base = String(value).split('/')[0] ?? ''
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  return cleaned.replace(/(^|[a-z])0+/g, '$1')
}

function normalizeSetCode(value) {
  if (!value) return ''
  return String(value).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function cardNumberMatches(searched, candidate) {
  if (!searched) return true
  if (!candidate) return false
  return normalizeCardNumber(candidate) === normalizeCardNumber(searched)
}

function setMatches(searched, candidate) {
  if (!searched) return true
  if (!candidate) return false
  const ns = normalizeSetCode(searched)
  if (!ns) return false
  const code = normalizeSetCode(candidate.code ?? '')
  const name = normalizeSetCode(candidate.name ?? '')
  return (
    (code !== '' && (code === ns || code.includes(ns) || ns.includes(code))) ||
    (name !== '' && (name === ns || name.includes(ns) || ns.includes(name)))
  )
}

// ── Mapeo de card_id local (pokemon-tcg-data) → TCGdex (espejo de src/lib/tcgdexId.ts) ──
const MCDONALDS_SET = {
  mcd11: '2011bw', mcd12: '2012bw', mcd14: '2014xy', mcd15: '2015xy', mcd16: '2016xy',
  mcd17: '2017sm', mcd18: '2018sm', mcd19: '2019sm', mcd21: '2021swsh', mcd22: '2022swsh'
}
const PADDED_NUMBER_SETS = new Set([
  'sv01', 'sv02', 'sv03', 'sv03.5', 'sv04', 'sv04.5', 'sv05', 'sv06', 'sv06.5',
  'sv07', 'sv08', 'sv08.5', 'sv09', 'sv10', 'svp',
  'swsh9', 'swsh10', 'swsh11', 'swsh12', 'swsh12.5'
])

function toTcgdexSetId(setId) {
  if (MCDONALDS_SET[setId]) return MCDONALDS_SET[setId]
  let id = setId
  id = id.replace(/pt(\d+)/, '.$1')
  id = id.replace(/^swsh35/, 'swsh3.5').replace(/^swsh45/, 'swsh4.5')
  const sv = id.match(/^sv(\d+)(\.\d+)?$/)
  if (sv) id = `sv${sv[1].padStart(2, '0')}${sv[2] ?? ''}`
  return id
}

function toTcgdexCardId(cardId) {
  const dash = cardId.lastIndexOf('-')
  if (dash <= 0) return cardId
  const setId = cardId.slice(0, dash)
  const num = cardId.slice(dash + 1)
  const tcgSet = toTcgdexSetId(setId)
  if (!/^\d+$/.test(num)) return `${tcgSet}-${num}`
  const padded = PADDED_NUMBER_SETS.has(tcgSet) ? num.padStart(3, '0') : num
  return `${tcgSet}-${padded}`
}

// ── Claves de integración (env var primero, luego app_settings) ─────────────
async function readApiKey(envName, dbKey) {
  const envValue = ENV[envName] || process.env[envName]
  if (envValue && envValue.trim() !== '') return envValue.trim()
  try {
    const { data } = await admin.from('app_settings').select('value').eq('key', dbKey).maybeSingle()
    return data?.value ?? null
  } catch {
    return null
  }
}

// ── Catálogo local (nombre/número/set por card_id) ─────────────────────────
let catalogById = null
async function loadCatalog() {
  if (catalogById) return catalogById
  const raw = await readFile(join(ROOT, 'src', 'content', 'index.json'), 'utf8')
  const index = JSON.parse(raw)
  catalogById = new Map(index.map((c) => [c.id, c]))
  return catalogById
}

// ── Utilidades HTTP ─────────────────────────────────────────────────────────
async function fetchJSON(url, opts = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) })
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt))
          continue
        }
        throw new Error(`HTTP ${res.status} ${url}`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return await res.json()
    } catch (err) {
      if (attempt >= retries) throw err
      await new Promise((r) => setTimeout(r, 1000 * attempt))
    }
  }
  throw new Error(`Falló tras ${retries} intentos: ${url}`)
}

// ── Fuente 1: TCGdex (exacto por card_id) ───────────────────────────────────
async function priceFromTcgdex(cardId) {
  // El catálogo local usa IDs de pokemon-tcg-data; TCGdex tiene su propia
  // convención (sv5-51 → sv05-051, mcd22-5 → 2022swsh-5).
  const tcgdexId = toTcgdexCardId(cardId)
  const json = await fetchJSON(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(tcgdexId)}`)
  const tcg = json.pricing?.tcgplayer
  return (
    tcg?.holofoil?.marketPrice ??
    tcg?.normal?.marketPrice ??
    tcg?.reverse?.marketPrice ??
    json.pricing?.cardmarket?.avg ??
    null
  )
}

// ── Fuente 2: PokeWallet ────────────────────────────────────────────────────
const TCG_VARIANT_RANK = { Holofoil: 0, 'Reverse Holofoil': 1, Normal: 2, '1st Edition': 3, Unlimited: 4, Shadowless: 5 }
function tcgRank(name) {
  if (!name) return 99
  return TCG_VARIANT_RANK[name] ?? 90
}

function bestTcgPrice(results) {
  let best = null
  for (const r of results) {
    for (const p of r.tcgplayer?.prices ?? []) {
      const price = p.market_price ?? p.mid_price ?? p.low_price ?? null
      if (price == null) continue
      const rank = tcgRank(p.sub_type_name)
      if (!best || rank < best.rank) best = { rank, price }
    }
  }
  return best ? best.price : null
}

function bestCardmarketPrice(results) {
  let best = null
  for (const r of results) {
    for (const p of r.cardmarket?.prices ?? []) {
      const price = p.avg ?? p.trend ?? p.low ?? null
      if (price == null) continue
      const holo = (p.variant_type ?? '').toLowerCase() === 'holo'
      if (!best || (holo && !best.holo)) best = { holo, price }
    }
  }
  return best ? best.price : null
}

function normalizeName(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

async function priceFromPokeWallet(key, { cardName, number, set }) {
  if (!key || !quotaOk('pokewallet')) return null
  const q = [cardName, number].filter(Boolean).join(' ')
  const res = await fetch(`${'https://api.pokewallet.io'}/search?q=${encodeURIComponent(q)}&limit=10`, {
    headers: { 'X-API-Key': key, 'User-Agent': 'tcgclaim/1.0' },
    signal: AbortSignal.timeout(30000)
  })
  QUOTAS.pokewallet.used++
  if (res.status === 401 || res.status === 403 || res.status === 429 || !res.ok) return null
  const json = await res.json()
  const results = json.results ?? []
  if (results.length === 0) return null

  const nName = normalizeName(cardName)
  const exact = results.filter((r) => {
    const n = normalizeName(r.card_info?.clean_name ?? r.card_info?.name ?? '')
    return n.includes(nName) || nName.includes(n)
  })
  let pool = exact.length > 0 ? exact : results

  if (number) {
    const byNumber = pool.filter((r) => cardNumberMatches(number, r.card_info?.card_number))
    if (byNumber.length === 0) return null
    pool = byNumber
  }
  if (set) {
    const bySet = pool.filter((r) =>
      setMatches(set, { code: r.card_info?.set_code, name: r.card_info?.set_name })
    )
    if (bySet.length > 0) pool = bySet
  }

  return bestTcgPrice(pool) ?? bestCardmarketPrice(pool)
}

// ── Fuente 3: PokéTrace ─────────────────────────────────────────────────────
const SOURCE_RANK = { tcgplayer: 0, ebay: 1, cardmarket: 2 }
const CONDITION_RANK = { NEAR_MINT: 0, MINT: 1, EXCELLENT: 2, GOOD: 3, LIGHT_PLAY: 4, MODERATE_PLAY: 5, POOR: 6, DAMAGED: 7 }

function bestPokeTracePrice(card) {
  let best = null
  for (const [source, conditions] of Object.entries(card.prices ?? {})) {
    for (const [condition, data] of Object.entries(conditions ?? {})) {
      const price = data.avg ?? data.low ?? null
      if (price == null) continue
      const sRank = SOURCE_RANK[source] ?? 90
      const cRank = CONDITION_RANK[condition] ?? 50
      if (!best || sRank < best.sRank || (sRank === best.sRank && cRank < best.cRank)) {
        best = { sRank, cRank, price }
      }
    }
  }
  return best ? { price: best.price, sRank: best.sRank, cRank: best.cRank } : null
}

async function priceFromPokeTrace(key, { cardName, number, set }) {
  if (!key || !quotaOk('poketrace')) return null
  const url = `${'https://api.poketrace.com'}/v1/cards?search=${encodeURIComponent(cardName)}&limit=5`
  const res = await fetch(url, {
    headers: { 'X-API-Key': key },
    signal: AbortSignal.timeout(30000)
  })
  QUOTAS.poketrace.used++
  if (res.status === 401 || res.status === 403 || res.status === 429 || !res.ok) return null
  const json = await res.json()
  let cards = json.data?.data ?? []
  if (cards.length === 0) return null

  if (number) {
    const byNumber = cards.filter((c) => cardNumberMatches(number, c.cardNumber))
    if (byNumber.length === 0) return null
    cards = byNumber
  }
  if (set) {
    const bySet = cards.filter((c) => setMatches(set, { code: c.set?.slug, name: c.set?.name }))
    if (bySet.length > 0) cards = bySet
  }

  let best = null
  for (const card of cards) {
    const p = bestPokeTracePrice(card)
    if (!p) continue
    if (!best || p.sRank < best.sRank || (p.sRank === best.sRank && p.cRank < best.cRank)) {
      best = p
    }
  }
  return best ? best.price : null
}

// ── Fuente 4: TCGAPI ────────────────────────────────────────────────────────
async function priceFromTcgApi(key, { cardName, number, set }) {
  if (!key || !quotaOk('tcgapi')) return null
  const url = `${'https://api.tcgapi.dev'}/v1/search?q=${encodeURIComponent(cardName)}&game=pokemon&per_page=10`
  const res = await fetch(url, {
    headers: { 'X-API-Key': key },
    signal: AbortSignal.timeout(30000)
  })
  QUOTAS.tcgapi.used++
  if (res.status === 401 || res.status === 403 || res.status === 429 || !res.ok) return null
  const json = await res.json()
  let cards = json.data ?? []
  if (cards.length === 0) return null

  if (number) {
    const byNumber = cards.filter((c) => cardNumberMatches(number, c.number))
    if (byNumber.length === 0) return null
    cards = byNumber
  }
  if (set) {
    const bySet = cards.filter((c) => setMatches(set, { code: c.set, name: c.set_name }))
    if (bySet.length > 0) cards = bySet
  }

  const best = cards.find((c) => c.price != null)
  return best ? best.price : null
}

// ── Resolución completa de precio ───────────────────────────────────────────
async function resolvePrice(cardId, keys) {
  const meta = catalogById?.get(cardId)
  const opts = meta ? { cardName: meta.name, number: meta.number, set: meta.setId } : null

  // 1. TCGdex (exacto, gratis)
  let price = null
  try {
    price = await priceFromTcgdex(cardId)
  } catch {
    price = null
  }
  if (price != null) return { price, source: 'tcgdex' }

  // Sin metadata del catálogo no podemos usar los fallbacks por nombre.
  if (!opts) return { price: null, source: 'none' }

  // 2-4. Fallbacks con número/set exacto (no saltan a homónimos)
  for (const [name, fn] of [
    ['pokewallet', () => priceFromPokeWallet(keys.pokewallet, opts)],
    ['poketrace', () => priceFromPokeTrace(keys.poketrace, opts)],
    ['tcgapi', () => priceFromTcgApi(keys.tcgapi, opts)]
  ]) {
    try {
      const p = await fn()
      if (p != null) return { price: p, source: name }
    } catch {
      // fuente caída: seguimos con la siguiente
    }
  }

  return { price: null, source: 'none' }
}

// ── Persistencia ────────────────────────────────────────────────────────────
async function applyChanges(changes) {
  let updatedRows = 0
  let updatedCache = 0

  for (const change of changes) {
    if (change.old === change.new && change.new != null) continue

    // binder_cards: todas las filas con esa carta
    const { error: rowsErr } = await admin
      .from('binder_cards')
      .update({ market_price: change.new, updated_at: new Date().toISOString() })
      .eq('card_id', change.cardId)
    if (rowsErr) {
      console.error(`  ✗ binder_cards ${change.cardId}: ${rowsErr.message}`)
      continue
    }
    updatedRows++

    // card_prices: caché compartida
    const { error: cacheErr } = await admin.from('card_prices').upsert(
      { card_id: change.cardId, market_price: change.new, updated_at: new Date().toISOString() },
      { onConflict: 'card_id' }
    )
    if (cacheErr) {
      console.error(`  ✗ card_prices ${change.cardId}: ${cacheErr.message}`)
      continue
    }
    updatedCache++
  }

  return { updatedRows, updatedCache }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const keys = {
    pokewallet: await readApiKey('POKEWALLET_API_KEY', 'pokewallet_api_key'),
    poketrace: await readApiKey('POKETRACE_API_KEY', 'poketrace_key'),
    tcgapi: await readApiKey('TCGAPI_KEY', 'tcgapi_key')
  }
  console.log('Claves de respaldo: PokeWallet', keys.pokewallet ? '✓' : '—',
    '· PokéTrace', keys.poketrace ? '✓' : '—',
    '· TCGAPI', keys.tcgapi ? '✓' : '—')

  const catalog = await loadCatalog()
  console.log(`Catálogo local: ${catalog.size} cartas`)

  // Todas las cartas con precio guardado (binder + caché)
  const cardIds = new Set()
  const current = new Map() // cardId -> precio actual
  const rows = await admin
    .from('binder_cards')
    .select('card_id, market_price')
    .not('market_price', 'is', null)
  for (const r of rows.data ?? []) {
    cardIds.add(r.card_id)
    if (r.market_price != null && !current.has(r.card_id)) current.set(r.card_id, r.market_price)
  }
  const cache = await admin.from('card_prices').select('card_id, market_price')
  for (const r of cache.data ?? []) {
    cardIds.add(r.card_id)
    if (r.market_price != null && !current.has(r.card_id)) current.set(r.card_id, r.market_price)
  }

  let targets = [...cardIds]
  if (ONLY) targets = targets.filter((id) => id === ONLY)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  console.log(`Cartas a re-verificar: ${targets.length} (${APPLY ? 'APPLY' : 'DRY RUN'})`)

  const changes = []
  const CONCURRENCY = 6
  let cursor = 0
  async function worker() {
    while (cursor < targets.length) {
      const cardId = targets[cursor++]
      const old = current.get(cardId) ?? null
      let resolved
      try {
        resolved = await resolvePrice(cardId, keys)
      } catch (err) {
        console.error(`  ✗ ${cardId}: ${err.message}`)
        continue
      }
      const newPrice = resolved.price != null ? Math.round(resolved.price * 100) / 100 : null

      // Solo actualizar precios VERIFICADOS: si no se pudo resolver (cuota de
      // un fallback agotada, set sin cobertura), se mantiene el precio actual
      // en vez de vaciarlo — nunca destruir un dato que no pudimos confirmar.
      if (newPrice == null) {
        if (old == null) continue // sin precio y sin verificación: nada que hacer
        console.log(`  ? ${cardId.padEnd(24)} no verificada → se mantiene $${old}`)
        continue
      }

      const changed = old !== newPrice
      if (changed) {
        changes.push({ cardId, old, new: newPrice, source: resolved.source })
      }
      const flag = changed ? '≠' : '='
      const line = `  ${flag} ${cardId.padEnd(24)} ${old != null ? `$${old}` : '—'} → $${newPrice} (${resolved.source})`
      console.log(line)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const fixed = changes.filter((c) => c.old != null && c.old !== c.new)
  const newOnes = changes.filter((c) => c.old == null && c.new != null)
  console.log(`\nResumen: ${changes.length} cambios detectados (${fixed.length} correcciones, ${newOnes.length} precios nuevos)`)

  if (!APPLY) {
    console.log('DRY RUN: no se escribió nada. Volvé a correr con --apply para guardar.')
    return
  }

  const { updatedRows, updatedCache } = await applyChanges(changes)
  console.log(`Aplicado: ${updatedRows} filas binder_cards y ${updatedCache} entradas card_prices actualizadas.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})