// Vendor de los estilos de cartas de https://github.com/simeydotme/pokemon-cards-css (MIT)
// Descarga CSS + imágenes y los guarda en el proyecto:
//   - app/vendor/pokemon-cards/pokemon-cards.css  (concatenado, rutas reescritas)
//   - public/vendor/pokemon-cards/img/            (assets)
//   - app/vendor/pokemon-cards/LICENSE            (MIT, atribución)
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BASE = 'https://raw.githubusercontent.com/simeydotme/pokemon-cards-css/main'
const API = 'https://api.github.com/repos/simeydotme/pokemon-cards-css/git/trees/main?recursive=1'
const CSS_DIR = join(ROOT, 'app', 'vendor', 'pokemon-cards')
const IMG_DIR = join(ROOT, 'public', 'vendor', 'pokemon-cards', 'img')

// Orden de concatenación (mismo que index.html del demo)
const EFFECTS = [
  'base',
  'basic',
  'amazing-rare',
  'cosmos-holo',
  'radiant-holo',
  'rainbow-alt',
  'rainbow-holo',
  'regular-holo',
  'reverse-holo',
  'secret-rare',
  'shiny-rare',
  'shiny-v',
  'shiny-vmax',
  'swsh-pikachu',
  'trainer-full-art',
  'trainer-gallery-holo',
  'trainer-gallery-secret-rare',
  'trainer-gallery-v-max',
  'trainer-gallery-v-regular',
  'v-full-art',
  'v-max',
  'v-regular',
  'v-star'
]

// Defaults de las variables de pointer/rotate que el demo define en el <style> de Card.svelte
const DEFAULTS = `
/* Defaults de interacción (tomados de Card.svelte del demo) */
:root {
  --pointer-x: 50%;
  --pointer-y: 50%;
  --card-scale: 1;
  --card-opacity: 0;
  --translate-x: 0px;
  --translate-y: 0px;
  --rotate-x: 0deg;
  --rotate-y: 0deg;
  --background-x: var(--pointer-x);
  --background-y: var(--pointer-y);
  --pointer-from-center: 0;
  --pointer-from-top: var(--pointer-from-center);
  --pointer-from-left: var(--pointer-from-center);
}
`

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} para ${url}`)
  return res
}

async function main() {
  await mkdir(CSS_DIR, { recursive: true })
  await mkdir(IMG_DIR, { recursive: true })

  // 1) Lista de imágenes de public/img (todas, por si algún efecto las usa)
  const treeRes = await fetch(API)
  const tree = await treeRes.json()
  const images = (tree.tree || [])
    .map((t) => t.path)
    .filter((p) => /^public\/img\/.+\.(png|jpg|jpeg|webp|gif)$/i.test(p))
    .map((p) => p.replace('public/img/', ''))
  console.log(`Imágenes a descargar: ${images.length}`)

  // 2) CSS concatenado
  const parts = []
  parts.push(await (await download(`${BASE}/public/css/cards.css`)).text())
  for (const effect of EFFECTS) {
    parts.push(await (await download(`${BASE}/public/css/cards/${effect}.css`)).text())
  }
  parts.push(DEFAULTS)

  // Reescribir url("/img/...") -> url("/vendor/pokemon-cards/img/...")
  const css = parts.join('\n').replace(/url\((["']?)\/img\//g, 'url($1/vendor/pokemon-cards/img/')
  await writeFile(join(CSS_DIR, 'pokemon-cards.css'), css)
  console.log(`CSS concatenado: ${(css.length / 1024).toFixed(1)} KB -> app/vendor/pokemon-cards/pokemon-cards.css`)

  // 3) Imágenes
  let ok = 0
  let fail = 0
  await Promise.all(
    images.map(async (img) => {
      try {
        const res = await download(`${BASE}/public/img/${img}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await writeFile(join(IMG_DIR, img), buf)
        ok++
      } catch (err) {
        fail++
        console.error(`  ✗ ${img}: ${err.message}`)
      }
    })
  )
  console.log(`Imágenes: ${ok} guardadas, ${fail} fallaron -> public/vendor/pokemon-cards/img/`)

  // 4) LICENSE (MIT, atribución obligatoria)
  const license = await (await download(`${BASE}/LICENSE`)).text()
  await writeFile(join(CSS_DIR, 'LICENSE'), license)
  console.log('LICENSE guardado en app/vendor/pokemon-cards/LICENSE')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
