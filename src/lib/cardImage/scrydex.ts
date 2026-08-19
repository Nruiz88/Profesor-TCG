/**
 * Fuente alternativa: Scrydex (images.scrydex.com).
 *
 * Cubre cartas que pokemontcg.io no tiene (sets chicos como McDonald's,
 * promos, etc.). Mismo tamaño hires (733x1024).
 *
 * Limitaciones:
 * - Solo imágenes en inglés.
 * - Usa el número SIN ceros a la izquierda (mep-38, no mep-038).
 *   Los sets importados de TCGdex guardan el número con padding.
 * - Cuando NO tiene una carta responde 200 OK con el REVERSO de la carta
 *   como body (mismo asset fijo para todas), así que un HEAD no sirve para
 *   detectar que falta: hay que comparar el contenido descargado.
 */

import { createHash } from 'node:crypto'

export function scrydexUrl(setId: string, number: string): string {
  return `https://images.scrydex.com/pokemon/${setId}-${number}/large`
}

/** Quita ceros a la izquierda: "038" → "38" */
export function unpadNumber(number: string): string {
  return number.replace(/^0+(?=\d)/, '')
}

/**
 * SHA-256 del reverso que sirve Scrydex para cartas que no tiene
 * (PNG 640x892, 186.316 bytes). Asset fijo en su CDN.
 */
const SCRYDEX_BACK_SHA =
  'fd7c3800f9b8ebadf4b31a735f569a180e66201741b00fafa17879967884ad2c'

/**
 * Verifica que una URL de Scrydex devuelva una imagen REAL de carta y no el
 * reverso genérico. Descarga el body y compara el hash (HEAD no alcanza:
 * Scrydex responde 200 también para cartas que no tiene).
 */
export async function scrydexUrlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    return createHash('sha256').update(buf).digest('hex') !== SCRYDEX_BACK_SHA
  } catch {
    return false
  }
}
