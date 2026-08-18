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
 */

export function scrydexUrl(setId: string, number: string): string {
  return `https://images.scrydex.com/pokemon/${setId}-${number}/large`
}

/** Quita ceros a la izquierda: "038" → "38" */
export function unpadNumber(number: string): string {
  return number.replace(/^0+(?=\d)/, '')
}
