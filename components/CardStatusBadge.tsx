import {
  CARD_STATUS_META,
  effectivePrice,
  normalizeStatus,
  statusBadgeText,
  type CardStatus
} from '@/lib/cardStatus'

interface CardStatusBadgeProps {
  status?: string | null
  marketPrice?: number | null
  priceOverride?: number | null
  className?: string
}

// Etiqueta del estado de la carta (En venta - $15 USD, Acepta cambios, Reservada...)
export default function CardStatusBadge({
  status,
  marketPrice,
  priceOverride,
  className = ''
}: CardStatusBadgeProps) {
  const s: CardStatus = normalizeStatus(status)
  const meta = CARD_STATUS_META[s]
  const price = effectivePrice(marketPrice ?? null, priceOverride)

  if (s === 'collection') return null

  return (
    <span
      className={`pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md ring-1 ${meta.badgeClass} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
      {statusBadgeText(s, price)}
    </span>
  )
}
