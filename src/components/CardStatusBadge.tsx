'use client'

import { useEffect, useState } from 'react'
import {
  availabilityBadgeText,
  availabilityFromFlags,
  CARD_STATUS_META,
  effectivePrice,
  normalizeStatus,
  type Availability,
  type CardStatus
} from '@/lib/cardStatus'
import { formatCountdown } from '@/lib/claim'

interface CardStatusBadgeProps {
  status?: string | null
  marketPrice?: number | null
  priceOverride?: number | null
  isForSale?: boolean | null
  isForTrade?: boolean | null
  price?: number | null
  manualPrice?: number | null
  /** Vencimiento de la reserva (soft lock). Muestra el tiempo restante en vivo. */
  reservedUntil?: string | null
  className?: string
}

// Etiqueta de la carta según su disponibilidad:
//  - Reservada -> ámbar con countdown del soft lock (24h)
//  - Solo venta -> verde con precio
//  - Solo cambio -> azul "🔄 Solo Trade"
//  - Venta o cambio -> combinado "💵 $15 / 🔄 Trade"
export default function CardStatusBadge({
  status,
  marketPrice,
  priceOverride,
  isForSale,
  isForTrade,
  price,
  manualPrice,
  reservedUntil,
  className = ''
}: CardStatusBadgeProps) {
  const s: CardStatus = normalizeStatus(status)

  // Countdown en vivo solo mientras el badge esté montado (1 tick por minuto).
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (s !== 'reserved' || !reservedUntil) return
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [s, reservedUntil])

  // Reservada es un estado de ciclo de vida aparte de la modalidad
  if (s === 'reserved') {
    const meta = CARD_STATUS_META.reserved
    const remaining =
      reservedUntil != null
        ? formatCountdown(new Date(reservedUntil).getTime() - now)
        : null
    return (
      <span
        className={`pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md ring-1 ${meta.badgeClass} ${className}`}
        title={remaining ? `Reservada · quedan ${remaining}` : meta.label}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
        {meta.label}
        {remaining != null && <span className="font-semibold opacity-80">· {remaining}</span>}
      </span>
    )
  }

  const avail: Availability = availabilityFromFlags(isForSale, isForTrade)
  if (avail === 'solo_coleccion') return null

  const effective = effectivePrice(marketPrice ?? null, priceOverride, price, manualPrice)

  const style: Record<Availability, string> = {
    solo_coleccion: '',
    solo_venta: 'bg-emerald-600/90 text-white ring-emerald-400/40',
    solo_cambio: 'bg-sky-600/90 text-white ring-sky-400/40',
    venta_o_cambio: 'bg-gradient-to-r from-emerald-600 to-sky-600 text-white ring-emerald-400/40'
  }

  return (
    <span
      className={`pointer-events-none inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md ring-1 ${style[avail]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          avail === 'solo_venta' ? 'bg-emerald-300' : avail === 'solo_cambio' ? 'bg-sky-300' : 'bg-white'
        }`}
        aria-hidden="true"
      />
      {availabilityBadgeText(avail, effective)}
    </span>
  )
}
