import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE_DIR = join(ROOT, 'data', 'cache')

const BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master'
const CONCURRENCY = 8

const args = process.argv.slice(2)
const onlySets = args.includes('--only-sets')
const setFilter = new Set(args.filter((a) => !a.startsWith('--')))

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: limit }, worker))
  return results
}

// Índice de búsqueda fusionado a partir de los archivos de sets presentes en la caché.
// Solo guarda los campos que usa la búsqueda para mantener el archivo liviano.
async function buildIndex() {
  const all = []
  const files = await readdir(CACHE_DIR)
  for (const file of files) {
    if (!file.endsWith('.json') || file === 'sets.json' || file === 'index.json') continue
    const setId = file.replace('.json', '')
    try {
      const cards = JSON.parse(await readFile(join(CACHE_DIR, file), 'utf8'))
      for (const card of cards) {
        all.push({
          id: card.id,
          name: card.name,
          supertype: card.supertype,
          subtypes: card.subtypes,
          number: card.number,
          rarity: card.rarity,
          hp: card.hp,
          types: card.types,
          images: card.images,
          setId
        })
      }
    } catch {
      // archivo de set ausente o corrupto: se saltea
    }
  }
  return all
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })

  console.log('Descargando sets…')
  const sets = await download(`${BASE}/sets/en.json`)
  await writeFile(join(CACHE_DIR, 'sets.json'), JSON.stringify(sets))
  console.log(`  ${sets.length} sets guardados en data/cache/sets.json`)

  if (onlySets) return

  const targets = setFilter.size > 0
    ? sets.filter((s) => setFilter.has(s.id))
    : sets

  let ok = 0
  let fail = 0

  const results = await mapLimit(targets, CONCURRENCY, async (set) => {
    const url = `${BASE}/cards/en/${set.id}.json`
    try {
      const cards = await download(url)
      await writeFile(join(CACHE_DIR, `${set.id}.json`), JSON.stringify(cards))
      ok++
      return `✓ ${set.id} (${cards.length})`
    } catch (err) {
      fail++
      return `✗ ${set.id}: ${err.message}`
    }
  })

  results.forEach((line) => process.stdout.write(`  ${line}\n`))

  console.log(`\nListo: ${ok} sets descargados, ${fail} fallaron.`)

  // Índice fusionado: evita leer 174 archivos en el primer request de búsqueda
  console.log('Generando índice de búsqueda…')
  const index = await buildIndex()
  await writeFile(join(CACHE_DIR, 'index.json'), JSON.stringify(index))
  console.log(`  ${index.length} cartas en data/cache/index.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})