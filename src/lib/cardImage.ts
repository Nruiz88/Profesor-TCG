// Fuente de imágenes: pokemontcg.io (CDN oficial de PokemonTCG).
// Ojo: cuando esa fuente no tiene la carta con el set/número exacto, responde
// HTTP 404 con el REVERSO de la carta como body — el navegador lo renderiza
// como si fuera la imagen real (y ni siquiera dispara onError). Por eso las
// rutas API verifican el status server-side y marcan las cartas sin imagen.
//
// Para cartas en idiomas no-ingleses, intentamos TCGdex primero
// (https://tcgdex.dev) que tiene imágenes localizadas. Si TCGdex no la tiene,
// caemos a la imagen EN de pokemontcg.io / Scrydex.

import type { CardLanguage } from '@/lib/cardLanguage'

export function cardImageUrl(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}_hires.png`
}

// Fuente alternativa: Scrydex sirve el mismo formato de ID que nuestro
// catálogo ({set}-{number}) y cubre cartas que pokemontcg.io no tiene
// (ej. sets chicos como McDonald's). Mismo tamaño hires (733x1024).
// Ojo: Scrydex usa el número SIN ceros a la izquierda (mep-38, no mep-038),
// mientras que los sets importados de TCGdex guardan el número con padding.
function scrydexImageUrl(setId: string, number: string): string {
  return `https://images.scrydex.com/pokemon/${setId}-${number}/large`
}

// Número sin ceros a la izquierda (ej. "038" → "38"), como lo espera Scrydex.
function unpadNumber(number: string): string {
  return number.replace(/^0+(?=\d)/, '')
}

// Mapeo de nuestros códigos de idioma a los códigos de TCGdex (ISO 639-1).
const TCGDEX_LANG_MAP: Record<string, string> = {
  ES: 'es',
  EN: 'en',
  JP: 'ja', // TCGdex usa "ja" para japonés
  KO: 'ko',
  ZH: 'zh'
}

// Extrae el "series" de TCGdex a partir del set ID de pokemontcg.io.
// Ej: "sv01" → "sv", "swsh3" → "swsh", "sm1" → "sm", "ex1" → "ex".
function tcgdexSeries(setId: string): string {
  const m = setId.match(/^([a-z]+)/i)
  return m ? m[1].toLowerCase() : ''
}

// Placeholder oscuro 63:88 (proporción de carta) con texto "Sin imagen"
export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880" viewBox="0 0 630 880">
    <rect width="630" height="880" rx="24" fill="#0f172a"/>
    <rect x="12" y="12" width="606" height="856" rx="18" fill="none" stroke="#1e293b" stroke-width="4"/>
    <text x="315" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#475569">Sin imagen</text>
    <text x="315" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#334155">no disponible</text>
  </svg>`
)}`

// Cache en memoria de resultados (por instancia serverless; alcanza para
// evitar repetir requests al CDN en cada carga del binder).
const imageCache = new Map<string, string>()

const head = async (u: string): Promise<boolean> => {
  try {
    const res = await fetch(u, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Intenta obtener la imagen localizada de TCGdex para una carta.
 * TCGdex usa URLs como: assets.tcgdex.net/{lang}/{series}/{setId}/{number}/high.png
 * Retorna la URL si existe, null si no.
 */
async function tryTcgdex(
  setId: string,
  number: string,
  language: CardLanguage
): Promise<string | null> {
  const lang = TCGDEX_LANG_MAP[language]
  if (!lang) return null

  const series = tcgdexSeries(setId)
  if (!series) return null

  // TCGdex numera los ceros a la izquierda en algunos sets
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

/**
 * Verifica server-side si la imagen de una carta existe. Orden de fuentes:
 *
 * Si el idioma NO es EN:
 *   1. TCGdex (imagen localizada en el idioma correcto)
 *
 * Fallback (o si el idioma es EN):
 *   1. pokemontcg.io (la oficial, siempre EN)
 *   2. Scrydex (cubre sets chicos que pokemontcg.io no tiene)
 *   3. NO_IMAGE_PLACEHOLDER ("Sin imagen")
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

  // Para idiomas no-ingleses, intentar TCGdex primero
  if (language !== 'EN') {
    const tcgdexUrl = await tryTcgdex(setId, number, language)
    if (tcgdexUrl) {
      imageCache.set(key, tcgdexUrl)
      return tcgdexUrl
    }
  }

  // Fallback: pokemontcg.io → Scrydex → placeholder
  const url = cardImageUrl(setId, number)
  const unpadded = unpadNumber(number)
  const scrydexPadded = scrydexImageUrl(setId, number)
  const scrydexUnpadded = scrydexImageUrl(setId, unpadded)

  const [pokemontcgOk, scrydexPaddedOk, scrydexUnpaddedOk] = await Promise.all([
    head(url),
    head(scrydexPadded),
    head(scrydexUnpadded)
  ])

  const resolved = pokemontcgOk
    ? url
    : scrydexPaddedOk
      ? scrydexPadded
      : scrydexUnpaddedOk
        ? scrydexUnpadded
        : NO_IMAGE_PLACEHOLDER
  imageCache.set(key, resolved)
  return resolved
}
