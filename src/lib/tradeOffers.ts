export type TradeOfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

export const TRADE_OFFER_STATUSES: TradeOfferStatus[] = [
  'pending',
  'accepted',
  'rejected',
  'cancelled'
]

export interface TradeOfferStatusMeta {
  label: string
  badgeClass: string
}

export const TRADE_OFFER_STATUS_META: Record<TradeOfferStatus, TradeOfferStatusMeta> = {
  pending: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-500/90 text-black ring-amber-300/40'
  },
  accepted: {
    label: 'Aceptada',
    badgeClass: 'bg-emerald-600/90 text-white ring-emerald-400/40'
  },
  rejected: {
    label: 'Rechazada',
    badgeClass: 'bg-red-600/90 text-white ring-red-400/40'
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-600/90 text-white ring-slate-400/40'
  }
}

export function isTradeOfferStatus(value: unknown): value is TradeOfferStatus {
  return typeof value === 'string' && value in TRADE_OFFER_STATUS_META
}

export function normalizeOfferStatus(value: unknown): TradeOfferStatus {
  return isTradeOfferStatus(value) ? value : 'pending'
}

// Snapshot de una carta guardado al crear la oferta (para la bandeja sin RLS cruzado)
export interface CardSnapshot {
  id: string
  card_name: string
  set_id: string
  number: string
  market_price: number | null
  price: number | null
  price_override: number | null
  manual_price?: number | null
  language?: string
}

// Snapshot del perfil (username / whatsapp / ubicación) al crear la oferta
export interface UserSnapshot {
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
}

// Fila cruda de la tabla
export interface TradeOfferRow {
  id: string
  sender_id: string
  receiver_id: string
  requested_card_id: string
  offered_card_ids: string[]
  cash_offered: number | null
  message: string | null
  status: string
  created_at: string
  requested_snapshot: CardSnapshot | null
  offered_snapshot: CardSnapshot[] | null
  sender_snapshot: UserSnapshot | null
  receiver_snapshot: UserSnapshot | null
}

// Carta enriquecida para la comparativa del inbox
export interface OfferCardView {
  id: string
  card_name: string
  set_id: string
  number: string
  image: string
  price: number | null
}

export interface OfferUserView {
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
}

// Oferta enriquecida tal como la consume la bandeja
export interface TradeOfferView {
  id: string
  status: TradeOfferStatus
  cash_offered: number
  message: string | null
  created_at: string
  requested: OfferCardView
  offered: OfferCardView[]
  totalRequested: number
  totalOffered: number
  sender: OfferUserView
  receiver: OfferUserView
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Texto de la comparativa de valores: "$20.00 vs $22.00 USD"
export function tradeValueText(totalRequested: number, totalOffered: number): string {
  return `$${fmt(totalRequested)} vs $${fmt(totalOffered)} USD`
}

// ¿El intercambio favorece al receptor (los que recibe valen más que lo que da)?
export function tradeIsFavorable(totalRequested: number, totalOffered: number): boolean {
  return totalOffered > 0 && totalOffered >= totalRequested
}
