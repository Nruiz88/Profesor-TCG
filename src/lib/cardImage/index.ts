/**
 * Resolución de imágenes de cartas Pokémon.
 *
 * Orquesta múltiples fuentes CDN con fallback automático:
 *
 *   1. TCGdex (solo para idiomas no-ingleses) → imagen localizada
 *   2. pokemontcg.io → fuente oficial, siempre EN
 *   3. Scrydex → cubre sets chicos que pokemontcg.io no tiene
 *   4. Placeholder "Sin imagen"
 *
 * Cada fuente vive en su propio archivo dentro de esta carpeta.
 */

import type { CardLanguage } from '@/lib/cardLanguage'
import { pokemontcgUrl } from './pokemontcg'
import { scrydexUrl, unpadNumber } from './scrydex'
import { tryTcgdex } from './tcgdex'
import { head, imageCache, NO_IMAGE_PLACEHOLDER } from './utils'

// Re-exportar para uso externo si hace falta
export { NO_IMAGE_PLACEHOLDER } from './utils'
export { pokemontcgUrl } from './pokemontcg'

/**
 * Resuelve la imagen de una carta verificando server-side qué fuentes la tienen.
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
  const key = `${setId}/${number}/${language}`

  const cached = imageCache.get(key)
  if (cached !== undefined) {
    return cached
  }

  // ── 1. TCGdex: solo para idiomas no-ingleses ──
  if (language !== 'EN') {
    const tcgdexResult = await tryTcgdex(setId, number, language)
    if (tcgdexResult) {
      imageCache.set(key, tcgdexResult)
      return tcgdexResult
    }
  }

  // ── 2. pokemontcg.io (oficial, EN) ──
  const pokemontcg = pokemontcgUrl(setId, number)
  if (await head(pokemontcg)) {
    imageCache.set(key, pokemontcg)
    return pokemontcg
  }

  // ── 3. Scrydex (fallback, EN) ──
  const unpadded = unpadNumber(number)
  const scrydexPadded = scrydexUrl(setId, number)
  const scrydexUnpadded = scrydexUrl(setId, unpadded)

  const [paddedOk, unpaddedOk] = await Promise.all([
    head(scrydexPadded),
    unpadded !== number ? head(scrydexUnpadded) : Promise.resolve(false)
  ])

  if (paddedOk) {
    imageCache.set(key, scrydexPadded)
    return scrydexPadded
  }
  if (unpaddedOk) {
    imageCache.set(key, scrydexUnpadded)
    return scrydexUnpadded
  }

  // ── 4. Sin imagen ──
  imageCache.set(key, NO_IMAGE_PLACEHOLDER)
  return NO_IMAGE_PLACEHOLDER
}
