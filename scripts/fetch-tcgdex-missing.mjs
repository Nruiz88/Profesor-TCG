// ============================================================================
// fetch-tcgdex-missing.mjs — Sincroniza los sets que faltan en el catálogo.
//
// La fuente primaria del catálogo es pokemon-tcg-data (pokemontcg.io), que no
// incluye varios sets promocionales/retro ni los sets japoneses. TCGdex
// (https://tcgdex.dev) es una API libre y sin auth que sí los cubre, y ya es
// proveedor de detalles/precios en la app. Este script baja los sets faltantes
// de TCGdex y los escribe en src/content/ con el MISMO schema de
// pokemon-tcg-data, para que searchCards los encuentre y el binder pueda
// agregarlos.
//
// Por set se hacen 2 tipos de requests:
//   1. REST  /v2/{lang}/sets/{id}  → metadata del set + resumen de cartas
//      (id, localId, name). El listado REST no trae metadata por carta.
//   2. GraphQL con aliases (una query por lote) → metadata completa de cada
//      carta (category, stage, types, hp, rarity, suffix, trainerType).
//
// Uso:
//   node scripts/fetch-tcgdex-missing.mjs                 # en + ja, todo lo que falte
//   node scripts/fetch-tcgdex-missing.mjs --lang en       # solo inglés
//   node scripts/fetch-tcgdex-missing.mjs --only-set mep  # solo un set (prueba)
// ============================================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CACHE_DIR = path.join(ROOT, 'src', 'content')
const EN_DIR = path.join(CACHE_DIR, 'en')
const JA_DIR = path.join(CACHE_DIR, 'ja')
await mkdir(EN_DIR, { recursive: true })
await mkdir(JA_DIR, { recursive: true })

const GQL = 'https://api.tcgdex.net/v2/graphql'
const BATCH = 60 // aliases por query GraphQL
const CONCURRENCY = 8 // sets en paralelo

const args = process.argv.slice(2)
const langArg = (args.find((a) => a.startsWith('--lang=')) || '').replace('--lang=', '')
const onlySet = (args.find((a) => a.startsWith('--only-set=')) || '').replace('--only-set=', '')
const force = args.includes('--force')
const LANGS = langArg === 'en' || langArg === 'ja' ? [langArg] : ['en', 'ja']

// --- utilidades -------------------------------------------------------------

async function fetchJSON(url) {
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt))
    }
  }
  throw lastErr
}

async function gql(query) {
  const res = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(60000)
  })
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(`GraphQL: ${json.errors[0].message}`)
  return json.data
}

// Mismo mapeo que src/services/expansions/tcgdex.service.ts (sv5 → sv05, sm1 → sm01)
function toTcgdexId(setId) {
  let id = setId.toLowerCase()
  id = id.replace(/pt5$/, '.5')
  const m = id.match(/^([a-z]+)(\d+(?:\.\d+)?)$/)
  if (!m) return id
  const [, prefix, num] = m
  if (prefix !== 'sv' && prefix !== 'sm') return id
  const fixed = num.includes('.')
    ? num.replace(/^(\d)\./, '0$1.')
    : num.padStart(2, '0')
  return `${prefix}${fixed}`
}

function normalize(s = '') {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9&]/g, '')
}

// --- transformación al schema pokemon-tcg-data ------------------------------

function toSubtypes(card) {
  if (card.category === 'Pokemon') {
    const parts = []
    if (card.stage) parts.push(card.stage)
    if (card.suffix) parts.push(card.suffix)
    return parts.length ? parts : undefined
  }
  if (card.category === 'Trainer') {
    return card.trainerType ? [card.trainerType] : undefined
  }
  if (card.category === 'Energy') {
    return card.energyType ? [card.energyType] : undefined
  }
  return undefined
}

function toCard(card) {
  return {
    id: card.id,
    name: card.name,
    supertype: card.category === 'Pokemon' ? 'Pokémon' : card.category === 'Energy' ? 'Energy' : 'Trainer',
    subtypes: toSubtypes(card),
    types: card.types && card.types.length ? card.types : undefined,
    number: card.localId,
    rarity: card.rarity || undefined,
    hp: card.hp != null ? String(card.hp) : undefined
  }
}

// --- lógica principal ---------------------------------------------------------

async function loadLocalSets() {
  const raw = await readFile(path.join(CACHE_DIR, 'sets.json'), 'utf8').catch(() => '[]')
  return JSON.parse(raw)
}

// Determina si un set de TCGdex ya existe en el catálogo local.
// Para `en` se compara por id mapeado (sv5 vs sv05) O por nombre normalizado
// (base1/hgss2/sve/svp/ru1/pgo existen con otro id). Para `ja` NO se usa el
// mapeo de ids (los ids japoneses son una convención propia; aunque un id
// coincida con un set en, es otro set).
function isPresent(localSets, tcgSet, lang) {
  if (lang === 'ja') return localSets.some((l) => normalize(l.name) === normalize(tcgSet.name))
  return localSets.some((l) => toTcgdexId(l.id) === tcgSet.id || normalize(l.name) === normalize(tcgSet.name))
}

async function fetchSet(lang, setId) {
  // 1. Metadata del set + resumen de cartas
  const set = await fetchJSON(`https://api.tcgdex.net/v2/${lang}/sets/${setId}`)
  if (!set?.cards?.length) throw new Error(`Sin cartas en ${lang}/${setId}`)

  // 2. Metadata completa por carta (GraphQL con aliases)
  const cards = []
  for (let i = 0; i < set.cards.length; i += BATCH) {
    const slice = set.cards.slice(i, i + BATCH)
    const aliases = slice
      .map((c, j) => `a${j}: card(id: "${c.id}") { id name localId category stage suffix trainerType energyType types hp rarity }`)
      .join(' ')
    const data = await gql(`{ ${aliases} }`)
    for (const c of slice) {
      const full = data[`a${slice.indexOf(c)}`] // alias por posición
      if (full) cards.push(toCard(full))
    }
  }

  return { set, cards }
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  const localSets = await loadLocalSets()

  const report = []
  const newSets = [] // entradas para sets.json
  let totalCards = 0

  for (const lang of LANGS) {
    const tcgSets = await fetchJSON(`https://api.tcgdex.net/v2/${lang}/sets`)
    const missing = tcgSets.filter((s) => !isPresent(localSets, s, lang))
    const targets = onlySet ? missing.filter((s) => s.id === onlySet) : missing
    if (onlySet && targets.length === 0 && tcgSets.some((s) => s.id === onlySet)) {
      // El set pedido existe en TCGdex pero ya está en el catálogo
      console.log(`  ${onlySet}: ya está en el catálogo (${lang})`)
      continue
    }
    console.log(`[${lang}] Sets faltantes: ${missing.length} (a procesar: ${targets.length})`)

    let done = 0
    const langDir = lang === 'ja' ? JA_DIR : EN_DIR
    const exists = async (f) => !!(await import('node:fs')).statSync(path.join(langDir, f), { throwIfNoEntry: false })
    async function worker(setId) {
      const collides = localSets.some((l) => l.id === setId)
      const fileId = lang === 'ja' && collides ? `${setId}_ja` : setId
      // Si el archivo ya existe y sets.json ya lo registra, se saltea (re-run barato)
      if (!onlySet && !force && (await exists(`${fileId}.json`)) && localSets.some((l) => l.id === fileId)) {
        done++
        report.push(`  - ${lang}/${setId} → ${fileId}.json ya sincronizado`)
        return
      }
      try {
        const { set, cards } = await fetchSet(lang, setId)
        // Colisión de ids EN/JA (ej. neo1): el archivo y el id de carta usan
        // el sufijo _ja para no pisar el set en existente.
        for (const card of cards) {
          if (fileId !== set.id) card.id = `${fileId}-${card.number}`
        }
        await writeFile(path.join(langDir, `${fileId}.json`), JSON.stringify(cards))
        const official = set.cardCount?.official ?? set.cardCount?.total ?? cards.length
        newSets.push({
          id: fileId,
          name: set.name,
          series: set.serie?.name || '',
          printedTotal: official,
          total: set.cardCount?.total ?? official,
          releaseDate: set.releaseDate || undefined
        })
        totalCards += cards.length
        done++
        report.push(`  ✓ ${lang}/${set.id} → ${fileId}.json (${cards.length}) — ${set.name}`)
      } catch (err) {
        report.push(`  ✗ ${lang}/${setId}: ${err.message}`)
      }
    }

    const queue = targets.map((s) => s.id)
    let cursor = 0
    async function pump() {
      while (cursor < queue.length) {
        const id = queue[cursor++]
        await worker(id)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, pump))
    console.log(`  ${done}/${targets.length} sets procesados en ${lang}`)
  }

  // Actualiza sets.json (fusiona las entradas nuevas)
  const seen = new Set(localSets.map((s) => s.id))
  const merged = [...localSets, ...newSets.filter((s) => !seen.has(s.id))]
  await writeFile(path.join(CACHE_DIR, 'sets.json'), JSON.stringify(merged))

  console.log('\nResumen:')
  for (const line of report) console.log(line)
  console.log(`\nTotal: ${newSets.length} sets nuevos, ${totalCards} cartas.`)
  console.log('sets.json actualizado. Regenerá el índice con: node scripts/build-search-index.mjs')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})