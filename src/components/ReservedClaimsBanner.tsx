'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import { formatCountdown, formatReservedUntil } from '@/lib/claim'
import { normalizeStatus } from '@/lib/cardStatus'
import { SwapIcon } from '@/components/icons'

interface ReservedClaimsBannerProps {
  cards: SlotCard[]
  onShowClaims: () => void
}

// Aviso al dueño del binder: cartas reservadas por claims (soft lock de 24h)
// con countdown en vivo y acceso directo a "Mis transacciones". Vive en su
// propio componente con su propio timer para no re-renderizar toda la página.
export default function ReservedClaimsBanner({ cards, onShowClaims }: ReservedClaimsBannerProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const reserved = cards
    .filter((c) => normalizeStatus(c.status) === 'reserved' && c.reserved_until)
    .sort(
      (a, b) => new Date(a.reserved_until!).getTime() - new Date(b.reserved_until!).getTime()
    )

  if (reserved.length === 0) return null

  const first = reserved[0]
  const remaining = first.reserved_until
    ? formatCountdown(new Date(first.reserved_until).getTime() - now)
    : null
  const names = reserved
    .slice(0, 2)
    .map((c) => c.card_name)
    .join(', ')
  const extra = reserved.length - 2

  return (
    <div className="banner banner--warn mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-amber-200">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <SwapIcon className="h-3.5 w-3.5 text-amber-300" />
          </span>
          {reserved.length} carta{reserved.length !== 1 ? 's' : ''} reservada
          {reserved.length !== 1 ? 's' : ''} por claims
          {remaining && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-200">
              ⏳ vence en {remaining}
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-xs text-amber-200/70" title={reserved.map((c) => c.card_name).join(' · ')}>
          {names}
          {extra > 0 && ` y ${extra} más`}
          {first.reserved_until && ` · hasta ${formatReservedUntil(first.reserved_until)}`}
        </p>
      </div>
      <button
        onClick={onShowClaims}
        className="btn-claim btn-claim--compact shrink-0 bg-amber-500 text-black hover:bg-amber-400"
      >
        Ver transacciones
      </button>
    </div>
  )
}
