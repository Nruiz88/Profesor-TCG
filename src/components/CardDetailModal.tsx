'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { FullCard } from '@/app/api/cards/[cardId]/route'
import { effectivePrice } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import LanguageBadge from './LanguageBadge'
import VariantBadge from './VariantBadge'
import PokemonCard from './PokemonCard'
import PriceInputWithGuide from './PriceInputWithGuide'

interface CardDetailModalProps {
  card: SlotCard
  canEdit?: boolean
  onSaved?: () => void
  onClose: () => void
}

export default function CardDetailModal({ card, canEdit = false, onSaved, onClose }: CardDetailModalProps) {
  const [detail, setDetail] = useState<FullCard | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/cards/${card.card_id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!active) return
        if (res.ok) setDetail(data.card)
      })
      .catch(() => {})
    return () => { active = false }
  }, [card.card_id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const name = detail?.name ?? card.card_name
  const setLabel = detail ? `${detail.set_name} · ${detail.number}` : `${card.set_id} · ${card.number}`
  const price = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)

  return (
    <div className="modal-overlay z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card modal-card--panel flex max-h-[90vh] w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header minimal */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{name}</h2>
            <p className="truncate text-[11px] text-slate-500">{setLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <VariantBadge variant={card.variant} />
            <LanguageBadge language={card.language} />
            <button onClick={onClose} className="ml-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Carta centrada + precio inline */}
          <div className="flex flex-col items-center gap-3 px-4 py-4">
            <div className="w-52">
              <PokemonCard card={card} />
            </div>

            {price != null && (
              <p className="text-center text-lg font-bold text-yellow-400">
                {formatPrice(price, card.currency)}
                {card.is_user_reported ? <span className="ml-1 text-xs text-yellow-400/60">★</span> : null}
              </p>
            )}
          </div>

          {/* Edit section */}
          {canEdit && (
            <div className="border-t border-slate-800 px-4 py-3">
              {/* Cantidad de copias */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Copias</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={async () => {
                      const qty = card.quantity ?? 1
                      if (qty <= 1) {
                        if (!window.confirm(`¿Quitar "${card.card_name}" de tu binder?`)) return
                        await fetch(`/api/binder/slots/${card.id}`, { method: 'DELETE' })
                      } else {
                        await fetch(`/api/binder/slots/${card.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ quantity: qty - 1 })
                        })
                      }
                      onSaved?.()
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-base font-bold text-slate-300 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                    aria-label="Quitar una copia"
                  >
                    −
                  </button>
                  <span className="min-w-9 text-center text-base font-bold text-white">
                    {card.quantity ?? 1}
                  </span>
                  <button
                    onClick={async () => {
                      const qty = card.quantity ?? 1
                      await fetch(`/api/binder/slots/${card.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ quantity: qty + 1 })
                      })
                      onSaved?.()
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 text-base font-bold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                    aria-label="Agregar una copia"
                  >
                    +
                  </button>
                </div>
              </div>
              <PriceInputWithGuide card={card} onSaved={onSaved} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
