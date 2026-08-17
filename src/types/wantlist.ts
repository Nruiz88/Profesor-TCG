export interface WantlistEntry {
  id: string
  user_id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string | null
  number: string
  max_budget: number | null
  currency: string
  created_at: string
}

export interface WantlistCard {
  id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string | null
  number: string
  max_budget: number | null
  currency: string
  image: string
}

export interface WantlistMatch {
  wantId: string
  cardId: string
  cardName: string
  setId: string
  set_name: string | null
  number: string
  maxBudget: number | null
  currency: string
  sellerSlotId: string
  sellerPrice: number | null
  sellerCurrency: string | null
}
