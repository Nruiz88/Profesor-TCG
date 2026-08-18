// ============================================================================
// build-search-index.mjs — Regenera src/content/index.json a partir de los
// archivos de sets presentes en src/content/. Mismo criterio que el buildIndex
// de fetch-catalog.mjs, pero sin descargar nada (útil tras agregar sets de
// TCGdex con fetch-tcgdex-missing.mjs).
// ============================================================================

import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '..', 'src', 'content')
const CONTENT_DIRS = [path.join(CACHE_DIR, 'en'), path.join(CACHE_DIR, 'ja')]

async function buildIndex() {
  const all = []
  for (const dir of CONTENT_DIRS) {
    let files
    try { files = await readdir(dir) } catch { continue }
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const setId = file.replace('.json', '')
      try {
        const cards = JSON.parse(await readFile(path.join(dir, file), 'utf8'))
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
  }
  return all
}

const index = await buildIndex()
await writeFile(path.join(CACHE_DIR, 'index.json'), JSON.stringify(index))
console.log(`  ${index.length} cartas en src/content/index.json`)