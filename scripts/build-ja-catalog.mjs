// ============================================================================
// build-ja-catalog.mjs — Construye los sets japoneses del catálogo a partir
// del dump de TCGdex (https://github.com/tcgdex/cards-database, carpeta
// data-asia). El dump trae la metadata completa (tipos, HP, rareza, etapa) que
// la API REST no entrega por set, y los nombres japoneses correctos.
//
// Descarga y extracción previa:
//   curl -L -o tcgdex-db.tar.gz https://codeload.github.com/tcgdex/cards-database/tar.gz/refs/heads/master
//   tar -xzf tcgdex-db.tar.gz
//
// Uso:
//   node scripts/build-ja-catalog.mjs --dump <ruta-a-cards-database-master>
// ============================================================================

import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CACHE_DIR = path.join(ROOT, 'src', 'content')
const JA_DIR = path.join(CACHE_DIR, 'ja')
const EN_DIR = path.join(CACHE_DIR, 'en')
await import('node:fs/promises').then(fs => fs.mkdir(JA_DIR, { recursive: true }))

// --- Detección automática de colisiones case-insensitive -------------------
// En Windows/macOS los filenames son case-insensitive, así que SM6.json (JA)
// y sm6.json (EN) colisionan. Escaneamos la carpeta EN para construir un
// set de ids ya existentes (normalizados a minúsculas).
async function existingSetIds(dir) {
  const ids = new Set()
  try {
    for (const f of await readdir(dir)) {
      if (f.endsWith('.json')) ids.add(f.replace(/\.json$/i, '').toLowerCase())
    }
  } catch {}
  return ids
}
const enIds = await existingSetIds(EN_DIR)

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').replace(`--${k}=`, '')
const DUMP = arg('dump') || 'C:/Users/chin0/AppData/Local/Temp/opencode/cards-database-master'
const ASIA = path.join(DUMP, 'data-asia')

// --- parseo de los .ts del dump -------------------------------------------------

const scalar = (txt, key) => {
  const re = new RegExp(`${key}:\\s*["']([^"']*)["']`)
  return txt.match(re)?.[1]
}

const nameJa = (txt) => {
  const block = txt.match(/name:\s*\{([\s\S]*?)\n\s*\}/)?.[1]
  if (!block) return undefined
  return block.match(/ja:\s*["']([^"']*)["']/)?.[1] ?? block.match(/en:\s*["']([^"']*)["']/)?.[1]
}

// Nombres candidatos de una carta del dump, en orden de preferencia.
// Algunos sets S/SV están guardados como zh-tw en lugar de ja.
const nameCandidates = (txt) => {
  const block = txt.match(/name:\s*\{([\s\S]*?)\n\s*\}/)?.[1]
  if (!block) return {}
  const pick = (k) => block.match(new RegExp(`['"]?${k.replace('-', '-?')}['"]?:\\s*["']([^"']*)["']`))?.[1]
  return { ja: pick('ja'), zhTw: pick('zh-tw'), zhCn: pick('zh-cn'), en: pick('en') }
}

const listTypes = (txt) => {
  const block = txt.match(/types:\s*\[([\s\S]*?)\]/)?.[1]
  if (!block) return undefined
  const items = [...block.matchAll(/["']([^"']+)["']/g)].map((m) => m[1])
  return items.length ? items : undefined
}

const intField = (txt, key) => {
  const m = txt.match(new RegExp(`\\b${key}:\\s*(\\d+)`))
  return m ? Number(m[1]) : undefined
}

function parseCard(fileId, localId, txt) {
  const category = scalar(txt, 'category') ?? 'Unknown'
  const stage = scalar(txt, 'stage')
  const suffix = scalar(txt, 'suffix')
  const trainerType = scalar(txt, 'trainerType')
  const energyType = scalar(txt, 'energyType')
  const types = listTypes(txt)
  const hp = intField(txt, 'hp')
  const rarity = scalar(txt, 'rarity')
  const names = nameCandidates(txt)

  const subtypes =
    category === 'Pokemon'
      ? [stage, suffix].filter(Boolean)
      : category === 'Trainer'
        ? trainerType
          ? [trainerType]
          : undefined
        : energyType
          ? [energyType]
          : undefined

  return {
    card: {
      id: `${fileId}-${localId}`,
      supertype: category === 'Pokemon' ? 'Pokémon' : category === 'Energy' ? 'Energy' : 'Trainer',
      subtypes: subtypes && subtypes.length ? subtypes : undefined,
      types,
      number: localId,
      rarity: rarity || undefined,
      hp: hp != null ? String(hp) : undefined
    },
    names
  }
}

async function fetchJaName(cardId) {
  try {
    const res = await fetch(`https://api.tcgdex.net/v2/ja/cards/${cardId}`, {
      signal: AbortSignal.timeout(20000)
    })
    if (!res.ok) return undefined
    const json = await res.json()
    return typeof json.name === 'string' ? json.name : undefined
  } catch {
    return undefined
  }
}

// --- mapeo id de set -> carpeta ------------------------------------------------

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) await walk(p, out)
    else if (e.name.endsWith('.ts')) out.push(p)
  }
  return out
}

async function loadSetMap() {
  const map = new Map()
  for (const f of await walk(ASIA)) {
    const rel = f.slice(ASIA.length + 1).split(path.sep)
    // el índice de set vive en {Serie}/{SetName}.ts, al lado de la carpeta {SetName}/
    if (rel.length !== 2) continue
    const txt = await readFile(f, 'utf8')
    const id = txt.match(/\bid:\s*["']([^"']+)["']/)?.[1]
    if (!id) continue
    map.set(id, { serieDir: rel[0], setName: rel[1].replace(/\.ts$/, ''), indexFile: f })
  }
  return map
}

// --- principal ------------------------------------------------------------------

const localSets = JSON.parse(await readFile(path.join(CACHE_DIR, 'sets.json'), 'utf8'))

const jaApi = await fetch('https://api.tcgdex.net/v2/ja/sets').then((r) => r.json())
const setMap = await loadSetMap()

const report = []
const newSets = []
let totalCards = 0
let fail = 0

for (const set of jaApi) {
  const target = setMap.get(set.id)
  if (!target) {
    report.push(`  ✗ ${set.id}: no existe en el dump`)
    fail++
    continue
  }
  const folder = path.join(ASIA, target.serieDir, target.setName)
  // Renombra con _ja si el id ya existe en la carpeta EN (colisión case-insensitive)
  const fileId = enIds.has(set.id.toLowerCase()) ? `${set.id}_ja` : set.id

  const setIndex = await readFile(target.indexFile, 'utf8')
  const name = nameJa(setIndex) ?? set.name
  const serieIndex = await readFile(path.join(ASIA, `${target.serieDir}.ts`), 'utf8')
  const serieName = nameJa(serieIndex) ?? target.serieDir
  const official = Number(setIndex.match(/cardCount:\s*\{[\s\S]*?official:\s*(\d+)/)?.[1] ?? 0)
  const release = setIndex.match(/\breleaseDate:\s*["']([^"']+)["']/)?.[1] || undefined

  try {
    const parsed = []
    for (const f of await walk(folder)) {
      const localId = f.slice(folder.length + 1).replace(/\.ts$/, '')
      const txt = await readFile(f, 'utf8')
      parsed.push(parseCard(fileId, localId, txt))
    }
    if (!parsed.length) throw new Error('carpeta sin cartas')

    // Resuelve el nombre: ja del dump → ja de la API → zh-tw → zh-cn → en
    const cards = []
    for (const { card, names } of parsed) {
      card.name = names.ja ?? (await fetchJaName(card.id)) ?? names.zhTw ?? names.zhCn ?? names.en ?? ''
      cards.push(card)
    }
    cards.sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }))

    await writeFile(path.join(JA_DIR, `${fileId}.json`), JSON.stringify(cards))
    newSets.push({
      id: fileId,
      name,
      series: serieName,
      printedTotal: official,
      total: official,
      releaseDate: release ? release.replace(/-/g, '/') : undefined
    })
    totalCards += cards.length
    report.push(`  ✓ ${set.id} → ${fileId}.json (${cards.length})`)
  } catch (err) {
    report.push(`  ✗ ${set.id}: ${err.message}`)
    fail++
  }
}

const seen = new Set(localSets.map((s) => s.id))
const merged = [...localSets, ...newSets.filter((s) => !seen.has(s.id))]
await writeFile(path.join(CACHE_DIR, 'sets.json'), JSON.stringify(merged))

console.log(`Sets JA procesados: ${jaApi.length} | ok: ${jaApi.length - fail} | fallos: ${fail} | cartas: ${totalCards}`)
for (const line of report) console.log(line)
console.log('sets.json actualizado. Regenerá el índice con: node scripts/build-search-index.mjs')