#!/usr/bin/env node
/**
 * Genera los splash screens de iOS a partir de src/app/icon.png.
 *
 * iOS no usa el manifest para el splash: se declaran con <link
 * rel="apple-touch-startup-image"> en el <head>, uno por dispositivo/resolución.
 * La imagen debe ser opaca, del tamaño EXACTO en píxeles de la pantalla y tener
 * media query con los puntos CSS + device-pixel-ratio + orientación.
 *
 * Salida (public/splash/): fondo de marca #0a0c10 con el logo centrado.
 *
 * Uso: node scripts/generate-pwa-splashes.mjs
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src', 'app', 'icon.png')
const OUT_DIR = join(ROOT, 'public', 'splash')
const LINKS_TS = join(ROOT, 'src', 'lib', 'splash-links.ts')
const BG = { r: 10, g: 12, b: 16 }
const LOGO_SCALE = 0.18

// { name, dw, dh (CSS points), ratio, orientation }
const DEVICES = [
  // iPhones (portrait)
  { name: 'iphone14promax', dw: 430, dh: 932, ratio: 3, orientation: 'portrait' },
  { name: 'iphone14pro', dw: 393, dh: 852, ratio: 3, orientation: 'portrait' },
  { name: 'iphone14', dw: 390, dh: 844, ratio: 3, orientation: 'portrait' },
  { name: 'iphone13mini', dw: 375, dh: 812, ratio: 3, orientation: 'portrait' },
  { name: 'iphone13promax', dw: 428, dh: 926, ratio: 3, orientation: 'portrait' },
  { name: 'iphonexr', dw: 414, dh: 896, ratio: 2, orientation: 'portrait' },
  { name: 'iphone8plus', dw: 414, dh: 736, ratio: 3, orientation: 'portrait' },
  { name: 'iphone8', dw: 375, dh: 667, ratio: 2, orientation: 'portrait' },
  { name: 'iphone5', dw: 320, dh: 568, ratio: 2, orientation: 'portrait' },
  // iPads
  { name: 'ipadpro129', dw: 1024, dh: 1366, ratio: 2, orientation: 'portrait' },
  { name: 'ipadpro129', dw: 1366, dh: 1024, ratio: 2, orientation: 'landscape' },
  { name: 'ipadpro11', dw: 834, dh: 1194, ratio: 2, orientation: 'portrait' },
  { name: 'ipadpro11', dw: 1194, dh: 834, ratio: 2, orientation: 'landscape' },
  { name: 'ipad10', dw: 820, dh: 1180, ratio: 2, orientation: 'portrait' },
  { name: 'ipad10', dw: 1180, dh: 820, ratio: 2, orientation: 'landscape' },
  { name: 'ipad102', dw: 810, dh: 1080, ratio: 2, orientation: 'portrait' },
  { name: 'ipad102', dw: 1080, dh: 810, ratio: 2, orientation: 'landscape' },
  { name: 'ipadmini6', dw: 744, dh: 1133, ratio: 2, orientation: 'portrait' },
  { name: 'ipadmini6', dw: 1133, dh: 744, ratio: 2, orientation: 'landscape' }
]

function mediaQuery(d) {
  return [
    `(device-width: ${d.dw}px)`,
    `(device-height: ${d.dh}px)`,
    `(-webkit-device-pixel-ratio: ${d.ratio})`,
    `(orientation: ${d.orientation})`
  ].join(' and ')
}

async function generate(d) {
  const w = d.dw * d.ratio
  const h = d.dh * d.ratio
  const logo = Math.round(Math.min(w, h) * LOGO_SCALE)

  const glyph = await sharp(SRC)
    .resize(logo, logo, { fit: 'cover' })
    .png()
    .toBuffer()

  const file = `${d.name}-${d.orientation}-${w}x${h}.png`
  await sharp({
    create: { width: w, height: h, channels: 3, background: BG }
  })
    .composite([{ input: glyph, gravity: 'center' }])
    .removeAlpha()
    .png()
    .toFile(join(OUT_DIR, file))

  return { href: `/splash/${file}`, media: mediaQuery(d) }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const links = []
  for (const d of DEVICES) links.push(await generate(d))

  const ts =
    '// GENERADO por scripts/generate-pwa-splashes.mjs — no editar a mano.\n' +
    'export interface SplashLink {\n' +
    '  href: string\n' +
    '  media: string\n' +
    '}\n\n' +
    `export const splashLinks: SplashLink[] = ${JSON.stringify(links, null, 2)}\n`
  await import('node:fs/promises').then(({ writeFile }) =>
    writeFile(LINKS_TS, ts, 'utf8')
  )

  console.log(`✅ ${links.length} splashes generados en ${OUT_DIR}`)
  console.log(`✅ Links actualizados en ${LINKS_TS}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})