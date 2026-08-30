#!/usr/bin/env node
/**
 * Escanea la carpeta de fondos de binders y genera el manifest:
 *
 *   public/binders/backgrounds/*.{jpg,jpeg,png,webp}
 *     → src/content/binder-backgrounds.json
 *       [ { "key": "aurora", "url": "/binders/backgrounds/aurora.jpg", "label": "Aurora" }, ... ]
 *
 * El label se deriva del nombre del archivo (capitalizado, guiones → espacios).
 * Uso: node scripts/build-binder-backgrounds.mjs
 * Corre automáticamente en `npm run build` (package.json).
 */

import { readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()
const BG_DIR = join(ROOT, 'public', 'binders', 'backgrounds')
const OUT_PATH = join(ROOT, 'src', 'content', 'binder-backgrounds.json')

const EXT_RE = /\.(jpe?g|png|webp)$/i

function toLabel(name) {
  return name
    .replace(/-|_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

async function main() {
  let files = []
  try {
    files = await readdir(BG_DIR)
  } catch {
    console.error('❌ No existe la carpeta public/binders/backgrounds')
    process.exit(1)
  }

  const backgrounds = files
    .filter((f) => EXT_RE.test(f))
    .sort((a, b) => a.localeCompare(b))
    .map((f) => {
      const key = f.replace(EXT_RE, '')
      return {
        key,
        url: `/binders/backgrounds/${f}`,
        label: toLabel(key)
      }
    })

  if (backgrounds.length === 0) {
    console.error('❌ No hay imágenes en public/binders/backgrounds')
    process.exit(1)
  }

  await writeFile(OUT_PATH, JSON.stringify(backgrounds, null, 2) + '\n', 'utf8')
  console.log(`✅ ${backgrounds.length} fondos de binder → ${OUT_PATH}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})