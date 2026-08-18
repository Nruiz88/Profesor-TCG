/**
 * Resolución de imágenes de cartas Pokémon.
 *
 * 1. Lee image-manifest.json (pre-computado offline, cero requests HTTP)
 * 2. Fallback: verifica server-side con HEAD requests (pokemontcg → Scrydex → TCGdex)
 *
 * El manifest se genera con: node scripts/precompute-images.mjs
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CardLanguage } from '@/lib/cardLanguage'
import { pokemontcgUrl } from './pokemontcg'
import { scrydexUrl, unpadNumber } from './scrydex'
import { tryTcgdex } from './tcgdex'
import { head, NO_IMAGE_PLACEHOLDER } from './utils'

// Re-exportar para uso externo
export { NO_IMAGE_PLACEHOLDER } from './utils'
export { pokemontcgUrl } from './pokemontcg'

// ── Manifest pre-computado ──────────────────────────────────────────

type ImageSource = 'pokemontcg' | 'scrydex' | 'scrydex-unpadded' | 'tcgdex' | 'none'

let manifest: Record<string, ImageSource> | null = null

function loadManifest(): Record<string, ImageSource> {
  if (manifest !== null) return manifest
  try {
    const raw = readFileSync(join(process.cwd(), 'src', 'content', 'image-manifest.json'), 'utf8')
    const parsed: Record<string, ImageSource> = JSON.parse(raw)
    manifest = parsed
    return parsed
  } catch {
    // Manifest no disponible (dev, test, etc.) — fallback a HEAD requests
    manifest = {}
    return manifest
  }
}

// ── Resolución ───────────────────────────────────────────────────────

/**
 * Resuelve la imagen de una carta.
 *
 * @param setId    - ID del set (ej: "sv03", "sm1", "base1")
 * @param number   - Número de la carta (ej: "75", "038")
 * @param language - Idioma de la copia física. Default: 'EN'
 * @returns URL de la imagen resuelta, o placeholder si no se encontró.
 */
export async function resolveCardImage(
  setId: string,
  number: string,
  language: CardLanguage = 'EN'
): Promise<string> {
  // ── 0. Manifest pre-computado (cero HTTP) ──
  const m = loadManifest()
  const source = m[setId]
  if (source) {
    return resolveFromSource(setId, number, language, source)
  }

  // ── 1. Fallback: HEAD requests en runtime ──
  return resolveViaHead(setId, number, language)
}

function resolveFromSource(
  setId: string,
  number: string,
  language: CardLanguage,
  source: ImageSource
): string {
  // Para idiomas no-ingleses, TCGdex es la fuente preferida
  if (language !== 'EN' && source !== 'tcgdex') {
    // Intentamos TCGdex de todas formas — si no está en el manifest como
    // fuente primaria, igualmente probamos (el manifest solo tiene EN).
    // Retornamos la URL de la fuente EN y el caller puede intentar TCGdex aparte.
    // Por simplicidad, usamos la fuente EN y dejamos que el frontend maneje el idioma.
  }

  const unpadded = unpadNumber(number)

  switch (source) {
    case 'pokemontcg':
      return pokemontcgUrl(setId, number)

    case 'scrydex':
      return scrydexUrl(setId, number)

    case 'scrydex-unpadded':
      return scrydexUrl(setId, unpadded)

    case 'tcgdex': {
      // Para tcgdex en el manifest, construir la URL EN
      const series = (setId.match(/^([a-z]+)/i) || [])[1]?.toLowerCase() || ''
      return `https://assets.tcgdex.net/en/${series}/${setId}/${number}/high.png`
    }

    default:
      return NO_IMAGE_PLACEHOLDER
  }
}

async function resolveViaHead(
  setId: string,
  number: string,
  language: CardLanguage
): Promise<string> {
  // Para idiomas no-ingleses, intentar TCGdex primero
  if (language !== 'EN') {
    const tcgdexResult = await tryTcgdex(setId, number, language)
    if (tcgdexResult) return tcgdexResult
  }

  // pokemontcg.io
  const pokemontcg = pokemontcgUrl(setId, number)
  if (await head(pokemontcg)) return pokemontcg

  // Scrydex
  const unpadded = unpadNumber(number)
  const scrydexPadded = scrydexUrl(setId, number)
  const scrydexUnpadded = scrydexUrl(setId, unpadded)

  if (await head(scrydexPadded)) return scrydexPadded
  if (unpadded !== number && (await head(scrydexUnpadded))) return scrydexUnpadded

  return NO_IMAGE_PLACEHOLDER
}
