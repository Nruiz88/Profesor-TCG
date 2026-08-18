/**
 * Fuente multilingüe: TCGdex (https://tcgdex.dev).
 *
 * Tiene imágenes localizadas en español, japonés, coreano y chino.
 * Cubre sets desde SM (Sol y Luna, 2017) hasta SV (Scarlet & Violet).
 * Sets viejos (era EX, Diamond & Pearl) no siempre están.
 *
 * URL de imagen: assets.tcgdex.net/{lang}/{series}/{setId}/{number}/high.png
 * El "series" se extrae del prefijo alfabético del set ID:
 *   sv01 → sv, swsh3 → swsh, sm1 → sm, ex1 → ex, xy1 → xy
 *
 * TCGdex usa "ja" para japonés (nuestro código es "JP").
 */

import type { CardLanguage } from '@/lib/cardLanguage'
import { unpadNumber } from './scrydex'
import { head } from './utils'

/** Mapeo de nuestros códigos de idioma a los códigos de TCGdex (ISO 639-1). */
const LANG_MAP: Record<string, string> = {
  ES: 'es',
  EN: 'en',
  JP: 'ja',
  KO: 'ko',
  ZH: 'zh'
}

/** Extrae el "series" de TCGdex a partir del set ID de pokemontcg.io. */
function extractSeries(setId: string): string {
  const m = setId.match(/^([a-z]+)/i)
  return m ? m[1].toLowerCase() : ''
}

/**
 * Intenta obtener la imagen localizada de TCGdex para una carta.
 * Retorna la URL si existe, null si no.
 */
export async function tryTcgdex(
  setId: string,
  number: string,
  language: CardLanguage
): Promise<string | null> {
  const lang = LANG_MAP[language]
  if (!lang) return null

  const series = extractSeries(setId)
  if (!series) return null

  // Intentar con el número tal cual (puede tener padding: "075")
  const url = `https://assets.tcgdex.net/${lang}/${series}/${setId}/${number}/high.png`
  if (await head(url)) return url

  // Intentar sin padding (ej: "075" → "75")
  const unpadded = unpadNumber(number)
  if (unpadded !== number) {
    const urlUnpadded = `https://assets.tcgdex.net/${lang}/${series}/${setId}/${unpadded}/high.png`
    if (await head(urlUnpadded)) return urlUnpadded
  }

  return null
}
