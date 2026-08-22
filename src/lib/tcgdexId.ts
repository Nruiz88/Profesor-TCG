// ============================================================================
// Mapeo de card_id del catálogo local (pokemon-tcg-data) al ID de TCGdex.
//
// El catálogo local usa los IDs de pokemon-tcg-data (p. ej. "sv5-51",
// "mcd22-5"), pero TCGdex usa su propia convención (p. ej. "sv05-051",
// "2022swsh-5"). Consultar TCGdex con el ID local falla con 404 para muchos
// sets y obliga a usar los fallbacks de precios (PokeWallet/PokéTrace/TCGAPI),
// que son los que pueden atribuirle a una carta el precio de una impresión
// homónima de otro set. Mapear el ID evita esos fallbacks innecesarios.
//
// Si un set no se puede mapear se devuelve el ID original: la consulta a
// TCGdex fallará con 404 y la cadena de fallbacks seguirá con match exacto.
// ============================================================================

const MCDONALDS_SET: Record<string, string> = {
  mcd11: '2011bw',
  mcd12: '2012bw',
  mcd14: '2014xy',
  mcd15: '2015xy',
  mcd16: '2016xy',
  mcd17: '2017sm',
  mcd18: '2018sm',
  mcd19: '2019sm',
  mcd21: '2021swsh',
  mcd22: '2022swsh'
}

// Sets de TCGdex que numeran las cartas con 3 dígitos (p. ej. sv05-001,
// swsh9-001). El resto numera sin pad (swsh1-1, sm1-1, base1-1, 2022swsh-1…).
const PADDED_NUMBER_SETS = new Set([
  'sv01',
  'sv02',
  'sv03',
  'sv03.5',
  'sv04',
  'sv04.5',
  'sv05',
  'sv06',
  'sv06.5',
  'sv07',
  'sv08',
  'sv08.5',
  'sv09',
  'sv10',
  'svp',
  'swsh9',
  'swsh10',
  'swsh11',
  'swsh12',
  'swsh12.5'
])

/** Convierte un set_id del catálogo local a su ID en TCGdex. */
export function toTcgdexSetId(setId: string): string {
  if (MCDONALDS_SET[setId]) return MCDONALDS_SET[setId]

  let id = setId

  // "12pt5" → "12.5" (Crown Zenith) y "12pt5gg" → "12.5gg" (Galarian Gallery)
  id = id.replace(/pt(\d+)/, '.$1')
  // swsh35 → swsh3.5 (Champion's Path), swsh45 → swsh4.5 (Shining Fates)
  id = id.replace(/^swsh35/, 'swsh3.5').replace(/^swsh45/, 'swsh4.5')
  // sv5 → sv05, sv3pt5 → sv03.5, sv10 → sv10
  const sv = id.match(/^sv(\d+)(\.\d+)?$/)
  if (sv) {
    const base = sv[1].padStart(2, '0')
    id = `sv${base}${sv[2] ?? ''}`
  }

  return id
}

/** Convierte un card_id del catálogo local ("sv5-51") al ID de TCGdex ("sv05-051"). */
export function toTcgdexCardId(cardId: string): string {
  const dash = cardId.lastIndexOf('-')
  if (dash <= 0) return cardId
  const setId = cardId.slice(0, dash)
  const num = cardId.slice(dash + 1)
  const tcgSet = toTcgdexSetId(setId)
  // Números con prefijo (SWSH054, TG01, SV001, GG01…) no llevan pad.
  if (!/^\d+$/.test(num)) return `${tcgSet}-${num}`
  const padded = PADDED_NUMBER_SETS.has(tcgSet) ? num.padStart(3, '0') : num
  return `${tcgSet}-${padded}`
}