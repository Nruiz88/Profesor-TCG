import type { Availability, CardStatus } from '@/types/card'

export type { Availability, CardStatus } from '@/types/card'

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

// ---------------------------------------------------------------------------
// Modalidad de disponibilidad: qué ofrece el usuario con la carta.
// ---------------------------------------------------------------------------

export const AVAILABILITIES: Availability[] = [
  'solo_coleccion',
  'solo_venta',
  'solo_cambio',
  'venta_o_cambio'
]

export interface AvailabilityMeta {
  label: string
  description: string
}

export const AVAILABILITY_META: Record<Availability, AvailabilityMeta> = {
  solo_coleccion: {
    label: 'Solo colección',
    description: 'Privada: no disponible para venta ni intercambio.'
  },
  solo_venta: {
    label: 'En venta',
    description: 'Fijá un precio y recibí claims por WhatsApp.'
  },
  solo_cambio: {
    label: 'Para intercambio',
    description: 'Aceptás cartas a cambio. Contá qué buscás.'
  },
  venta_o_cambio: {
    label: 'Venta o cambio',
    description: 'Precio en efectivo y también aceptás intercambios.'
  }
}

export function isAvailability(value: unknown): value is Availability {
  return typeof value === 'string' && value in AVAILABILITY_META
}

// Flags de la DB (is_for_sale / is_for_trade) -> modalidad
export function availabilityFromFlags(
  isForSale: boolean | null | undefined,
  isForTrade: boolean | null | undefined
): Availability {
  const sale = !!isForSale
  const trade = !!isForTrade
  if (sale && trade) return 'venta_o_cambio'
  if (sale) return 'solo_venta'
  if (trade) return 'solo_cambio'
  return 'solo_coleccion'
}

// Modalidad -> flags de la DB
export function availabilityToFlags(a: Availability): {
  isForSale: boolean
  isForTrade: boolean
} {
  return {
    isForSale: a === 'solo_venta' || a === 'venta_o_cambio',
    isForTrade: a === 'solo_cambio' || a === 'venta_o_cambio'
  }
}

// status derivado (legacy) para una modalidad — 'reserved' se mantiene aparte
export function statusFromAvailability(a: Availability): CardStatus {
  if (a === 'solo_cambio') return 'for_trade'
  if (a === 'solo_coleccion') return 'collection'
  return 'for_sale' // solo_venta y venta_o_cambio
}

// Texto del badge según la modalidad:
//  solo_venta      -> "En venta - $15.00"
//  solo_cambio     -> "🔄 Solo Trade"
//  venta_o_cambio  -> "💵 $15.00 / 🔄 Trade"
export function availabilityBadgeText(avail: Availability, price: number | null): string {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (avail === 'solo_venta') {
    return price != null ? `En venta - $${fmt(price)}` : 'En venta'
  }
  if (avail === 'solo_cambio') {
    return '🔄 Solo Trade'
  }
  if (avail === 'venta_o_cambio') {
    return price != null ? `💵 $${fmt(price)} / 🔄 Trade` : '💵 En venta / 🔄 Trade'
  }
  return 'Colección'
}

export function normalizeStatus(value: unknown): CardStatus {
  return isCardStatus(value) ? value : 'collection'
}

// Precio efectivo: el precio del usuario prima, luego el override legacy, luego la API
export function effectivePrice(
  market: number | null,
  override: number | null | undefined,
  price: number | null | undefined = undefined
): number | null {
  if (price != null && price > 0) return price
  if (override != null && override > 0) return override
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
