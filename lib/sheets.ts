export const SLOTS_PER_SHEET = 9

export interface RawCard {
  id: string
  binder_id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  slot_number: number
  market_price: number | null
  status?: string | null
  price_override?: number | null
  is_for_sale?: boolean | null
  is_for_trade?: boolean | null
  price?: number | null
  trade_notes?: string | null
  condition?: string | null
  language?: string | null
  manual_price?: number | null
  currency?: string | null
  is_user_reported?: boolean | null
  reserved_until?: string | null
  rarity?: string | null
  supertype?: string | null
  subtypes?: string[] | null
  types?: string[] | null
}

export interface SlotCard extends RawCard {
  image: string
}

export function toSlotCard(card: RawCard & { image?: string }): SlotCard {
  return {
    ...card,
    // Si la API ya resolvió la imagen (con placeholder para las que no existen),
    // la usamos; si no, armamos la URL estándar como fallback.
    image: card.image ?? `https://images.pokemontcg.io/${card.set_id}/${card.number}_hires.png`
  }
}

export function groupIntoSheets(cards: SlotCard[]): SlotCard[][] {
  const sheets: SlotCard[][] = []
  for (const card of cards) {
    const sheetIndex = Math.floor((card.slot_number - 1) / SLOTS_PER_SHEET)
    if (!sheets[sheetIndex]) sheets[sheetIndex] = []
    sheets[sheetIndex].push(card)
  }
  for (let i = 0; i < sheets.length; i++) {
    if (!sheets[i]) sheets[i] = []
  }
  return sheets
}

export function padSheet(cards: SlotCard[]): (SlotCard | null)[] {
  const arr: (SlotCard | null)[] = Array(SLOTS_PER_SHEET).fill(null)
  for (const card of cards) {
    const idx = (card.slot_number - 1) % SLOTS_PER_SHEET
    arr[idx] = card
  }
  return arr
}

// Páginas del paginado: 2 hojas visibles por página
export function sheetPageCount(sheetCount: number): number {
  return Math.max(1, Math.ceil(sheetCount / 2))
}

export function computeTotalValue(cards: SlotCard[]): number {
  return cards.reduce((sum, c) => sum + (c.market_price ?? 0), 0)
}
