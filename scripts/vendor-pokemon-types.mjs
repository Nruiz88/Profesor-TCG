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

async function main() {
  await mkdir(OUT, { recursive: true })

  await Promise.all(
    TYPES.map(async (t) => {
      const res = await fetch(`${BASE}/icons/${t}.svg`)
      if (!res.ok) throw new Error(`Error descargando ${t}.svg: HTTP ${res.status}`)
      const svg = await res.text()
      await writeFile(path.join(OUT, `${t}.svg`), svg, 'utf8')
      console.log(`✓ ${t}.svg (${svg.length} bytes)`)
    })
  )

  const readme = await fetch(`${BASE}/README.md`)
  if (readme.ok) {
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
