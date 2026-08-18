// Vendor: duiker101/pokemon-type-svg-icons (MIT, sin archivo LICENSE en el repo)
// Descarga los 18 SVG de tipos de Pokémon a public/vendor/pokemon-types/
// y guarda el README como atribución.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'vendor', 'pokemon-types')

const TYPES = [
  'bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire',
  'flying', 'ghost', 'grass', 'ground', 'ice', 'normal', 'poison',
  'psychic', 'rock', 'steel', 'water'
]

const BASE = 'https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master'

async function downloadWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res
      if (res.status === 429 || res.status >= 500) {
        const wait = Math.pow(2, i) * 2000
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 2000))
    }
  }
  throw new Error(`Failed: ${url}`)
}

async function main() {
  await mkdir(OUT, { recursive: true })

  await Promise.all(
    TYPES.map(async (t) => {
      const res = await downloadWithRetry(`${BASE}/icons/${t}.svg`)
      const svg = await res.text()
      await writeFile(path.join(OUT, `${t}.svg`), svg, 'utf8')
      console.log(`✓ ${t}.svg (${svg.length} bytes)`)
    })
  )

  const readme = await downloadWithRetry(`${BASE}/README.md`).catch(() => null)
  if (readme && readme.ok) {
    await writeFile(
      path.join(OUT, 'README-duiker101.md'),
      `# pokemon-type-svg-icons\n\nFuente: https://github.com/duiker101/pokemon-type-svg-icons\n\n${await readme.text()}`,
      'utf8'
    )
    console.log('✓ README-duiker101.md')
  }

  console.log(`\nListo: ${TYPES.length} SVG en ${path.relative(ROOT, OUT)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
