export type CardStatus = 'collection' | 'for_sale' | 'for_trade' | 'reserved'

export const CARD_STATUSES: CardStatus[] = ['collection', 'for_sale', 'for_trade', 'reserved']

export interface CardStatusMeta {
  label: string
  badgeClass: string
  dotClass: string
}

export const CARD_STATUS_META: Record<CardStatus, CardStatusMeta> = {
  collection: {
    label: 'Colección',
    badgeClass: 'bg-slate-800/90 text-slate-300 ring-slate-600/40',
    dotClass: 'bg-slate-400'
  },
  for_sale: {
    label: 'En venta',
    badgeClass: 'bg-emerald-600/90 text-white ring-emerald-400/40',
    dotClass: 'bg-emerald-400'
  },
  for_trade: {
    label: 'Acepta cambios',
    badgeClass: 'bg-sky-600/90 text-white ring-sky-400/40',
    dotClass: 'bg-sky-400'
  },
  reserved: {
    label: 'Reservada',
    badgeClass: 'bg-amber-500/90 text-black ring-amber-300/40',
    dotClass: 'bg-amber-400'
  }
}

export function isCardStatus(value: unknown): value is CardStatus {
  return typeof value === 'string' && value in CARD_STATUS_META
}

export function normalizeStatus(value: unknown): CardStatus {
  return isCardStatus(value) ? value : 'collection'
}

// Precio efectivo: el override del usuario prima sobre el de la API
export function effectivePrice(market: number | null, override: number | null | undefined): number | null {
  if (override != null) return override
  return market != null && market > 0 ? market : null
}

// Texto de badge para cartas en venta: "En venta - $15 USD"
export function statusBadgeText(
  status: CardStatus,
  price: number | null
): string {
  if (status === 'for_sale' && price != null) {
    return `En venta - $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return CARD_STATUS_META[status].label
}
