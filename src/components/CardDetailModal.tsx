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
  const price = effectivePrice(card.market_price, card.price_override, card.price)

  return (
    <div className="modal-overlay z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card modal-card--sm max-h-[90vh] w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header minimal */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
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

        {/* Carta centrada + precio inline */}
        <div className="flex flex-col items-center gap-3 px-4 pb-4">
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
            <PriceInputWithGuide card={card} onSaved={onSaved} />
          </div>
        )}
      </div>
    </div>
  )
}
