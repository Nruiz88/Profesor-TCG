import { describe, expect, it } from 'vitest'
import { cardNumberMatches, normalizeCardNumber, normalizeSetCode, setMatches } from './priceMatch'

describe('normalizeCardNumber', () => {
  it('normaliza el formato con barra a solo el número', () => {
    expect(normalizeCardNumber('05/15')).toBe('5')
    expect(normalizeCardNumber('5/15')).toBe('5')
  })

  it('quita ceros a la izquierda', () => {
    expect(normalizeCardNumber('05')).toBe('5')
    expect(normalizeCardNumber('007')).toBe('7')
  })

  it('conserva prefijos alfanuméricos (promos)', () => {
    expect(normalizeCardNumber('SWSH054')).toBe('swsh54')
    expect(normalizeCardNumber('TG03')).toBe('tg3')
  })

  it('devuelve vacío para valores nulos o vacíos', () => {
    expect(normalizeCardNumber(null)).toBe('')
    expect(normalizeCardNumber(undefined)).toBe('')
    expect(normalizeCardNumber('')).toBe('')
  })
})

describe('normalizeSetCode', () => {
  it('normaliza código y nombre de set', () => {
    expect(normalizeSetCode('MCD22')).toBe('mcd22')
    expect(normalizeSetCode("McDonald's 2022")).toBe('mcdonalds2022')
    expect(normalizeSetCode('SV: Black Bolt')).toBe('svblackbolt')
  })

  it('devuelve vacío para valores nulos', () => {
    expect(normalizeSetCode(null)).toBe('')
    expect(normalizeSetCode(undefined)).toBe('')
  })
})

describe('cardNumberMatches', () => {
  it('acepta cualquier candidato si no hay número buscado', () => {
    expect(cardNumberMatches(undefined, '5')).toBe(true)
    expect(cardNumberMatches(null, '5')).toBe(true)
  })

  it('rechaza candidatos sin número', () => {
    expect(cardNumberMatches('5', undefined)).toBe(false)
    expect(cardNumberMatches('5', '')).toBe(false)
  })

  it('coincide entre formatos distintos', () => {
    expect(cardNumberMatches('5', '05/15')).toBe(true)
    expect(cardNumberMatches('5', '05')).toBe(true)
    expect(cardNumberMatches('SWSH054', 'swsh54')).toBe(true)
  })

  it('rechaza números distintos', () => {
    expect(cardNumberMatches('5', '171')).toBe(false)
    expect(cardNumberMatches('5', '15')).toBe(false)
  })
})

describe('setMatches', () => {
  it('acepta cualquier candidato si no hay set buscado', () => {
    expect(setMatches(undefined, { code: 'mcd22' })).toBe(true)
    expect(setMatches(null, { code: 'mcd22' })).toBe(true)
  })

  it('rechaza candidatos sin información de set', () => {
    expect(setMatches('mcd22', undefined)).toBe(false)
    expect(setMatches('mcd22', null)).toBe(false)
    expect(setMatches('mcd22', { code: null, name: null })).toBe(false)
  })

  it('coincide por código de set', () => {
    expect(setMatches('mcd22', { code: 'MCD22' })).toBe(true)
    expect(setMatches('mcd22', { code: 'mcd22' })).toBe(true)
  })

  it('rechaza sets distintos', () => {
    expect(setMatches('mcd22', { code: 'sv8pt5' })).toBe(false)
    expect(setMatches('mcd22', { code: 'mcd21' })).toBe(false)
  })
})