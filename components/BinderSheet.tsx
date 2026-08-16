'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import PokemonCard from './PokemonCard'
import CardDetailModal from './CardDetailModal'
import CardStatusBadge from './CardStatusBadge'
import ClaimModal from './ClaimModal'
import {
  CARD_STATUSES,
  CARD_STATUS_META,
  effectivePrice,
  normalizeStatus,
  type CardStatus
} from '@/lib/cardStatus'
import type { SellerInfo } from './SellerInfoBadge'

interface BinderSheetProps {
  sheetNumber: number
  slots: (SlotCard | null)[]
  onRemoveSlot?: (slotId: string) => void
  onEmptySlotClick?: (slotIndex: number) => void
  onSellCard?: (card: SlotCard) => void
  onStatusChange?: (card: SlotCard, status: CardStatus, priceOverride: number | null) => void
  seller?: SellerInfo | null
  highlightCardId?: string | null
}

export default function BinderSheet({
  sheetNumber,
  slots,
  onRemoveSlot,
  onEmptySlotClick,
  onSellCard,
  onStatusChange,
  seller,
  highlightCardId
}: BinderSheetProps) {
  const [selected, setSelected] = useState<SlotCard | null>(null)
  const [claimCard, setClaimCard] = useState<SlotCard | null>(null)

  function handleCardClick(card: SlotCard) {
    // En vista pública, las cartas en venta/cambio abren el modal de claim
    if (!onRemoveSlot && !onStatusChange) {
      const s = normalizeStatus(card.status)
      if (s === 'for_sale' || s === 'for_trade') {
        setClaimCard(card)
        return
      }
    }
    setSelected(card)
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hoja {sheetNumber}</h3>
        <span className="text-xs font-medium text-slate-600">{slots.filter(Boolean).length}/9</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {slots.map((card, i) => (
          <div key={i} className="group relative aspect-[63/88] rounded-xl">
            {card ? (
              <div className="relative h-full w-full">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(card)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCardClick(card)
                  }}
                  data-card-id={card.id}
                  className={`h-full w-full cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-binder-accent ${
                    card.id === highlightCardId
                      ? 'ring-2 ring-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.25)]'
                      : ''
                  }`}
                  aria-label={`Ver detalle de ${card.card_name}`}
                >
                  <PokemonCard card={card} />
                </div>

                {/* Precio efectivo (override o mercado) */}
                {effectivePrice(card.market_price, card.price_override) != null && (
                  <div className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30">
                    $
                    {effectivePrice(card.market_price, card.price_override)?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}

                {/* Badge de estado */}
                <CardStatusBadge
                  status={card.status}
                  marketPrice={card.market_price}
                  priceOverride={card.price_override}
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
                />

                {onRemoveSlot && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveSlot(card.id)
                    }}
                    className="absolute left-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    aria-label={`Quitar ${card.card_name}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {onSellCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSellCard(card)
                    }}
                    className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity hover:bg-emerald-500 group-hover:opacity-100"
                    aria-label={`Vender ${card.card_name}`}
                  >
                    Vender
                  </button>
                )}

                {/* Control de estado (solo binder propio) */}
                {onStatusChange && (
                  <div className="absolute bottom-1 left-1 right-1 hidden flex-col gap-1 group-hover:flex">
                    <select
                      value={normalizeStatus(card.status)}
                      onChange={(e) =>
                        onStatusChange(
                          card,
                          e.target.value as CardStatus,
                          card.price_override ?? null
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded-lg bg-black/80 px-1.5 py-1 text-[10px] font-semibold text-white"
                      aria-label={`Estado de ${card.card_name}`}
                    >
                      {CARD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {CARD_STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                    {normalizeStatus(card.status) === 'for_sale' && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={card.price_override != null ? 'Precio manual' : 'Precio manual…'}
                        defaultValue={card.price_override ?? ''}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value)
                          onStatusChange(card, 'for_sale', v)
                        }}
                        className="w-full rounded-lg bg-black/80 px-1.5 py-1 text-[10px] font-semibold text-white"
                        aria-label={`Precio manual de ${card.card_name}`}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : onEmptySlotClick ? (
              <button
                type="button"
                onClick={() => onEmptySlotClick(i)}
                className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-800/30 transition-colors hover:border-slate-600 hover:bg-slate-800/50"
                aria-label={`Agregar carta al bolsillo ${i + 1}`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-700" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 14v4M10 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl border border-slate-800/70 bg-slate-800/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-700/60" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {selected && <CardDetailModal card={selected} onClose={() => setSelected(null)} />}
      {claimCard && seller && (
        <ClaimModal card={claimCard} seller={seller} onClose={() => setClaimCard(null)} />
      )}
    </div>
  )
}
