import { describe, expect, it } from 'vitest'
import {
  SLOTS_PER_SHEET,
  computeTotalValue,
  findNextEmptySlot,
  groupIntoSheets,
  padSheet,
  sheetPageCount,
  toSlotCard,
  type RawCard,
  type SlotCard
} from './sheets'

function slotCard(overrides: Partial<SlotCard> = {}): SlotCard {
  return {
    id: 'base1-4',
    binder_id: 'binder-1',
    card_id: 'base1-4',
    card_name: 'Charizard',
    set_id: 'base1',
    number: '4',
    slot_number: 1,
    market_price: 10,
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
    ...overrides
  }
}

describe('SLOTS_PER_SHEET', () => {
  it('usa 9 bolsillos por hoja', () => {
    expect(SLOTS_PER_SHEET).toBe(9)
  })
})

describe('toSlotCard', () => {
  it('arma la URL de la imagen hires desde set_id y number', () => {
    const raw: RawCard = {
      id: 'base1-4',
      binder_id: 'binder-1',
      card_id: 'base1-4',
      card_name: 'Charizard',
      set_id: 'base1',
      number: '4',
      slot_number: 1,
      market_price: 12.5
    }
    expect(toSlotCard(raw)).toEqual({
      ...raw,
      image: 'https://images.pokemontcg.io/base1/4_hires.png'
    })
  })
})

describe('groupIntoSheets', () => {
  it('agrupa los primeros 9 slots en una sola hoja', () => {
    const cards = Array.from({ length: 9 }, (_, i) =>
      slotCard({ id: `c${i}`, card_id: `c${i}`, slot_number: i + 1 })
    )
    const sheets = groupIntoSheets(cards)
    expect(sheets.length).toBe(1)
    expect(sheets[0].length).toBe(9)
  })

  it('crea una hoja nueva cada 9 slots', () => {
    const cards = [1, 10, 19].map((slot_number) => slotCard({ id: `c${slot_number}`, card_id: `c${slot_number}`, slot_number }))
    const sheets = groupIntoSheets(cards)
    expect(sheets.length).toBe(3)
    expect(sheets[0].map((c) => c.slot_number)).toEqual([1])
    expect(sheets[1].map((c) => c.slot_number)).toEqual([10])
    expect(sheets[2].map((c) => c.slot_number)).toEqual([19])
  })

  it('rellena con hojas vacías los huecos intermedios', () => {
    const cards = [12, 13].map((slot_number) => slotCard({ id: `c${slot_number}`, card_id: `c${slot_number}`, slot_number }))
    const sheets = groupIntoSheets(cards)
    expect(sheets.length).toBe(2)
    expect(sheets[0]).toEqual([])
    expect(sheets[1].length).toBe(2)
  })
})

describe('padSheet', () => {
  it('ubica cada carta en su posición dentro de la hoja', () => {
    const cards = [slotCard({ slot_number: 1 }), slotCard({ id: 'c2', card_id: 'c2', slot_number: 9 })]
    const padded = padSheet(cards)
    expect(padded.length).toBe(9)
    expect(padded[0]?.slot_number).toBe(1)
    expect(padded[8]?.slot_number).toBe(9)
  })

  it('rellena con null los bolsillos vacíos', () => {
    const padded = padSheet([slotCard({ slot_number: 5 })])
    expect(padded.filter((c) => c === null).length).toBe(8)
    expect(padded[4]?.slot_number).toBe(5)
  })
})

describe('sheetPageCount', () => {
  it('muestra 2 hojas por página', () => {
    expect(sheetPageCount(0)).toBe(1)
    expect(sheetPageCount(1)).toBe(1)
    expect(sheetPageCount(2)).toBe(1)
    expect(sheetPageCount(3)).toBe(2)
    expect(sheetPageCount(4)).toBe(2)
    expect(sheetPageCount(5)).toBe(3)
  })
})

describe('findNextEmptySlot', () => {
  it('devuelve 1 cuando el binder está vacío', () => {
    expect(findNextEmptySlot([])).toBe(1)
  })

  it('devuelve el primer hueco respetando los bolsillos ocupados', () => {
    const cards = [1, 2, 4, 5].map((slot_number) => slotCard({ slot_number }))
    expect(findNextEmptySlot(cards)).toBe(3)
  })

  it('crece al final cuando el binder está completo', () => {
    const cards = [1, 2, 3].map((slot_number) => slotCard({ slot_number }))
    expect(findNextEmptySlot(cards)).toBe(4)
  })

  it('ignora huecos intermedios desordenados', () => {
    const cards = [9, 1, 3].map((slot_number) => slotCard({ slot_number }))
    expect(findNextEmptySlot(cards)).toBe(2)
  })
})

describe('computeTotalValue', () => {
  it('suma los precios de mercado', () => {
    const cards = [
      slotCard({ market_price: 10 }),
      slotCard({ id: 'c2', card_id: 'c2', market_price: 5.5 })
    ]
    expect(computeTotalValue(cards)).toBe(15.5)
  })

  it('trata los precios null como 0', () => {
    const cards = [slotCard({ market_price: null }), slotCard({ id: 'c2', card_id: 'c2', market_price: 3 })]
    expect(computeTotalValue(cards)).toBe(3)
  })

  it('devuelve 0 sin cartas', () => {
    expect(computeTotalValue([])).toBe(0)
  })
})
