#!/usr/bin/env node
/**
 * Genera los íconos PWA a partir de src/app/icon.png.
 *
 * Salida (public/icons/):
 *   icon-192.png                  — ícono estándar 192x192
 *   icon-512.png                  — ícono estándar 512x512
 *   icon-maskable-192.png         — con área segura para máscaras (Android)
 *   icon-maskable-512.png         — con área segura para máscaras (Android)
 *   apple-touch-icon.png          — 180x180 para iOS home screen
 *
 * El ícono se centra sobre el fondo de marca (#0a0c10). Los maskable se
 * escalan al ~60% para respetar el "safe zone" que recorta la máscara.
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src', 'app', 'icon.png')
const OUT_DIR = join(ROOT, 'public', 'icons')
const BG = { r: 10, g: 12, b: 16, alpha: 1 }

const SIZES = [192, 512]
const SAFE_SCALE = 0.62

async function standard(size) {
  return sharp(SRC)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(join(OUT_DIR, `icon-${size}.png`))
}

async function maskable(size) {
  const scaled = Math.round(size * SAFE_SCALE)
  const glyph = await sharp(SRC)
    .resize(scaled, scaled, { fit: 'cover' })
    .png()
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .png()
    .toFile(join(OUT_DIR, `icon-maskable-${size}.png`))
}

async function apple() {
  return sharp(SRC)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(join(OUT_DIR, 'apple-touch-icon.png'))
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const size of SIZES) {
    await standard(size)
    console.log(`✅ icon-${size}.png`)
    await maskable(size)
    console.log(`✅ icon-maskable-${size}.png`)
  }
  await apple()
  console.log('✅ apple-touch-icon.png (180x180)')
  console.log(`\n✅ Íconos generados en ${OUT_DIR}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})