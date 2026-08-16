import { describe, expect, it } from 'vitest'
import { filterCards, type CardData, type SetData } from './catalog'

const sets: SetData[] = [
  { id: 'base1', name: 'Base', series: 'Base', printedTotal: 102, total: 102 },
  { id: 'swsh1', name: 'Sword & Shield', series: 'Sword & Shield', printedTotal: 202, total: 216 }
]

const index: Array<CardData & { setId: string }> = [
  { id: 'base1-4', name: 'Charizard', number: '4', rarity: 'Rare Holo', setId: 'base1' },
  { id: 'base1-58', name: 'Blastoise', number: '58', setId: 'base1' },
  { id: 'swsh1-4', name: 'Celebi', number: '4', setId: 'swsh1' },
  { id: 'swsh1-5', name: 'Charizard V', number: '5', setId: 'swsh1' }
]

describe('filterCards', () => {
  it('devuelve [] con query vacía o de solo espacios', () => {
    expect(filterCards('', index, sets)).toEqual([])
    expect(filterCards('   ', index, sets)).toEqual([])
  })

  describe('por nombre', () => {
    it('filtra por nombre, sin distinguir mayúsculas', () => {
      const result = filterCards('CHARIZARD', index, sets)
      expect(result.map((c) => c.id)).toEqual(['base1-4', 'swsh1-5'])
    })

    it('respeta el límite de resultados', () => {
      expect(filterCards('charizard', index, sets, 1)).toHaveLength(1)
    })

    it('no matchea substrings de otros campos', () => {
      expect(filterCards('blastoise', index, sets).map((c) => c.id)).toEqual(['base1-58'])
    })
  })

  describe('por número', () => {
    it('encuentra cartas por número en cualquier set', () => {
      const result = filterCards('4', index, sets)
      expect(result.map((c) => c.id)).toEqual(['base1-4', 'swsh1-4'])
    })

    it('acota por total del set: "4/102" solo en base1', () => {
      const result = filterCards('4/102', index, sets)
      expect(result.map((c) => c.id)).toEqual(['base1-4'])
    })

    it('no matchea cuando el total no coincide', () => {
      expect(filterCards('4/202', index, sets).map((c) => c.id)).toEqual(['swsh1-4'])
    })

    it('combina número con nombre de set', () => {
      expect(filterCards('4 base', index, sets).map((c) => c.id)).toEqual(['base1-4'])
      expect(filterCards('5 sword', index, sets).map((c) => c.id)).toEqual(['swsh1-5'])
    })

    it('acepta formato "4/102 base"', () => {
      expect(filterCards('4/102 base', index, sets).map((c) => c.id)).toEqual(['base1-4'])
    })
  })
})
