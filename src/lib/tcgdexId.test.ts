import { describe, expect, it } from 'vitest'
import { toTcgdexCardId, toTcgdexSetId } from './tcgdexId'

describe('toTcgdexSetId', () => {
  it('mapea sets McDonald\'s a la convención de TCGdex', () => {
    expect(toTcgdexSetId('mcd11')).toBe('2011bw')
    expect(toTcgdexSetId('mcd22')).toBe('2022swsh')
    expect(toTcgdexSetId('mcd19')).toBe('2019sm')
  })

  it('reformatea sv a dos dígitos (con y sin decimal)', () => {
    expect(toTcgdexSetId('sv1')).toBe('sv01')
    expect(toTcgdexSetId('sv5')).toBe('sv05')
    expect(toTcgdexSetId('sv10')).toBe('sv10')
    expect(toTcgdexSetId('sv3pt5')).toBe('sv03.5')
    expect(toTcgdexSetId('sv8pt5')).toBe('sv08.5')
  })

  it('reformatea swsh con decimal (35 → 3.5, 12pt5 → 12.5)', () => {
    expect(toTcgdexSetId('swsh35')).toBe('swsh3.5')
    expect(toTcgdexSetId('swsh45')).toBe('swsh4.5')
    expect(toTcgdexSetId('swsh45sv')).toBe('swsh4.5sv')
    expect(toTcgdexSetId('swsh12pt5')).toBe('swsh12.5')
    expect(toTcgdexSetId('swsh12pt5gg')).toBe('swsh12.5gg')
  })

  it('deja los ids ya compatibles intactos', () => {
    expect(toTcgdexSetId('base1')).toBe('base1')
    expect(toTcgdexSetId('sm1')).toBe('sm1')
    expect(toTcgdexSetId('swsh1')).toBe('swsh1')
    expect(toTcgdexSetId('svp')).toBe('svp')
    expect(toTcgdexSetId('smp')).toBe('smp')
    expect(toTcgdexSetId('swsh9tg')).toBe('swsh9tg')
  })
})

describe('toTcgdexCardId', () => {
  it('mapea el set y pad de número según convención', () => {
    expect(toTcgdexCardId('sv5-51')).toBe('sv05-051')
    expect(toTcgdexCardId('sv10-218')).toBe('sv10-218')
    expect(toTcgdexCardId('sv3pt5-151')).toBe('sv03.5-151')
    expect(toTcgdexCardId('mcd22-5')).toBe('2022swsh-5')
    expect(toTcgdexCardId('swsh9-186')).toBe('swsh9-186')
    expect(toTcgdexCardId('swsh8-284')).toBe('swsh8-284')
    expect(toTcgdexCardId('swsh12pt5-160')).toBe('swsh12.5-160')
  })

  it('no toca los números con prefijo (promos / trainer gallery)', () => {
    expect(toTcgdexCardId('swshp-SWSH291')).toBe('swshp-SWSH291')
    expect(toTcgdexCardId('swsh9tg-TG04')).toBe('swsh9tg-TG04')
    expect(toTcgdexCardId('swsh12pt5gg-GG03')).toBe('swsh12.5gg-GG03')
    expect(toTcgdexCardId('svp-001')).toBe('svp-001')
  })

  it('devuelve el id intacto si no hay separador', () => {
    expect(toTcgdexCardId('base1')).toBe('base1')
  })
})