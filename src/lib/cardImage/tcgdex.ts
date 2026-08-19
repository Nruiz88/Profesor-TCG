/**
 * Fuente multilingüe: TCGdex (https://tcgdex.dev).
 *
 * Tiene imágenes localizadas en español, japonés, coreano y chino, y además
 * cubre sets que pokemontcg.io/Scrydex NO tienen: Pokémon TCG Pocket (A1, B1a,
 * ...) y los sets japoneses (S, SV, SM, M, ...).
 *
 * URL de imagen: assets.tcgdex.net/{lang}/{serie}/{setId}/{number}/high.png
 *
 * Para los sets del catálogo que no cubre pokemontcg.io usamos un mapa estático
 * (src/content/tcgdex-images.json) generado offline: ahí está la serie correcta
 * (tcgp para Pocket, SV/S/SM en mayúsculas para los sets japoneses, etc.).
 * Para los sets estándar EN se deriva la serie del prefijo del ID (sv3 → sv).
 *
 * TCGdex usa "ja" para japonés (nuestro código es "JP").
 */

import type { CardLanguage } from '@/lib/cardLanguage'
import { unpadNumber } from './scrydex'
import { head } from './utils'

// @ts-ignore — Next.js resuelve JSON imports en build time
import tcgdexImages from '../../content/tcgdex-images.json'
const tcgdexMap = tcgdexImages as Record<string, string>

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
 * Prefijo base de imagen TCGdex ("lang/serie/tcgdexId") para un set.
 * Prioriza el mapa estático; para sets estándar EN lo deriva del prefijo.
 */
export function tcgdexImagePrefix(
  setId: string,
  language: CardLanguage
): string | null {
  const mapped = tcgdexMap[setId]
  if (mapped) return mapped

  const lang = LANG_MAP[language] || 'en'
  const series = extractSeries(setId)
  if (!series) return null
  return `${lang}/${series}/${setId}`
}

/** URL (sin verificar) de la imagen TCGdex para una carta. */
export function tcgdexUrl(
  setId: string,
  number: string,
  language: CardLanguage
): string | null {
  const prefix = tcgdexImagePrefix(setId, language)
  if (!prefix) return null
  return `https://assets.tcgdex.net/${prefix}/${number}/high.png`
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
  const url = tcgdexUrl(setId, number, language)
  if (url && (await head(url))) return url

  // Intentar sin padding (ej: "075" → "75")
  const unpadded = unpadNumber(number)
  if (unpadded !== number) {
    const urlUnpadded = tcgdexUrl(setId, unpadded, language)
    if (urlUnpadded && (await head(urlUnpadded))) return urlUnpadded
  }

  return null
}