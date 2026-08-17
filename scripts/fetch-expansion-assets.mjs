import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'expansions', 'logos')
const IMAGES_BASE = 'https://images.pokemontcg.io'
const SCRYDEX_BASE = 'https://images.scrydex.com/pokemon'

// Descarga los logos oficiales de las expansiones (images.pokemontcg.io) a
// /public/expansions/logos/{setId}.png. Sirven como primer fallback local de
// imágenes del servicio getExpansionData.
const args = process.argv.slice(2)
const setFilter = new Set(args.filter((a) => !a.startsWith('--')))

async function getCatalogSets() {
  const raw = await readFile(join(ROOT, 'src', 'content', 'sets.json'), 'utf8')
  return JSON.parse(raw)
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Logo de un set: pokemontcg.io primero; Scrydex cubre los sets que esa CDN
// no tiene (ej. los de McDonald's: /pokemon/me5-logo/logo).
async function downloadLogo(setId) {
  const sources = [
    `${IMAGES_BASE}/${setId}/logo.png`,
    `${SCRYDEX_BASE}/${setId}-logo/logo`
  ]
  for (const url of sources) {
    try {
      return await download(url)
    } catch {
      // probar la siguiente fuente
    }
  }
  throw new Error('sin logo en pokemontcg.io ni Scrydex')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const sets = await getCatalogSets()
  const targets = setFilter.size > 0 ? sets.filter((s) => setFilter.has(s.id)) : sets

  let ok = 0
  let fail = 0
  for (const set of targets) {
    try {
      const buf = await downloadLogo(set.id)
      await writeFile(join(OUT_DIR, `${set.id}.png`), buf)
      ok++
      process.stdout.write(`  ✓ ${set.id} (${buf.length} bytes)\n`)
    } catch (err) {
      fail++
      process.stdout.write(`  ✗ ${set.id}: ${err.message}\n`)
    }
  }

  console.log(`\nListo: ${ok} logos descargados, ${fail} fallaron.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
