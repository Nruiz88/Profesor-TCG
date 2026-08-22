// ============================================================================
// Coincidencia de cartas para fuentes de precios externas (PokeWallet,
// PokéTrace, TCGAPI).
//
// Los fallbacks buscan por nombre + número, pero los proveedores pueden
// devolver cartas homónimas de OTROS sets con números distintos (p. ej. una
// Victini cara de SV: Black Bolt para una promo de McDonald's 05/15). Para no
// atribuirle a una carta el precio de una impresión distinta, estas funciones
// validan que el número (y preferiblemente el set) coincida antes de aceptar
// un precio.
// ============================================================================

/**
 * Normaliza el número de una carta para comparar entre catálogos:
 * "05/15" -> "5", "SWSH054" -> "swsh54", "171" -> "171".
 */
export function normalizeCardNumber(value: string | null | undefined): string {
  if (!value) return ''
  const base = value.split('/')[0] ?? ''
  const cleaned = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  return cleaned.replace(/(^|[a-z])0+/g, '$1')
}

/**
 * Normaliza un código de set para comparar entre catálogos:
 * "MCD22" -> "mcd22", "McDonald's 2022" -> "mcdonalds2022".
 */
export function normalizeSetCode(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/**
 * ¿El número de una carta candidata coincide con el número buscado?
 * Sin número buscado, cualquier candidato es válido.
 */
export function cardNumberMatches(
  searched: string | null | undefined,
  candidate: string | null | undefined
): boolean {
  if (!searched) return true
  if (!candidate) return false
  return normalizeCardNumber(candidate) === normalizeCardNumber(searched)
}

/**
 * ¿El set de una carta candidata coincide con el set buscado? Compara el
 * código y el nombre del proveedor contra el código del catálogo local
 * (TCGdex), tolerando diferencias de formato ("mcd22" vs "MCD22").
 */
export function setMatches(
  searched: string | null | undefined,
  candidate: { code?: string | null; name?: string | null } | null | undefined
): boolean {
  if (!searched) return true
  if (!candidate) return false
  const ns = normalizeSetCode(searched)
  if (!ns) return false

  const code = normalizeSetCode(candidate.code ?? '')
  const name = normalizeSetCode(candidate.name ?? '')

  return (
    (code !== '' && (code === ns || code.includes(ns) || ns.includes(code))) ||
    (name !== '' && (name === ns || name.includes(ns) || ns.includes(name)))
  )
}