'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import PokemonCard from './PokemonCard'
import CardDetailModal from './CardDetailModal'
import CardStatusBadge from './CardStatusBadge'
import ClaimModal from './ClaimModal'
import { effectivePrice, normalizeStatus } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import LanguageBadge from './LanguageBadge'
import ConditionBadge from './ConditionBadge'
import type { SellerInfo } from './SellerInfoBadge'

interface BinderSheetProps {
  sheetNumber: number
  slots: (SlotCard | null)[]
  onRemoveSlot?: (slotId: string) => void
  onEmptySlotClick?: (slotIndex: number) => void
  onEditCard?: (card: SlotCard) => void
  /** Cierra la venta de una carta reservada (solo vista del dueño) */
  onMarkSold?: (cardId: string) => void
  /** Refresca el binder tras guardar idioma/precio manual desde el detalle */
  onCardUpdated?: () => void
  seller?: SellerInfo | null
  highlightCardId?: string | null
}

export default function BinderSheet({
  sheetNumber,
  slots,
  onRemoveSlot,
  onEmptySlotClick,
  onEditCard,
  onMarkSold,
  onCardUpdated,
  seller,
  highlightCardId
}: BinderSheetProps) {
  const [selected, setSelected] = useState<SlotCard | null>(null)
  const [claimCard, setClaimCard] = useState<SlotCard | null>(null)

  function handleCardClick(card: SlotCard) {
    // En vista pública, las cartas en venta/cambio abren el modal de claim
    if (!onRemoveSlot && !onEditCard) {
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

                {/* Contador de copias: se muestra cuando hay más de una de la misma carta */}
                {(card.quantity ?? 1) > 1 && (
                  <div
                    title={`${card.quantity} copias de ${card.card_name}`}
                    className="pointer-events-none absolute bottom-9 left-1/2 z-10 -translate-x-1/2 rounded-full bg-fuchsia-600/95 px-2.5 py-0.5 text-[11px] font-black text-white shadow-lg ring-1 ring-white/20"
                  >
                    x{card.quantity}
                  </div>
                )}

                {/* Idioma de la copia (esquina superior izquierda) */}
                <LanguageBadge
                  language={card.language}
                  className="absolute left-1.5 top-1.5"
                />

                {/* Estado físico (NM, EX, …) bajo el idioma */}
                <ConditionBadge
                  condition={card.condition}
                  className="absolute left-1.5 top-9"
                />

                {/* Precio efectivo (manual del usuario o mercado) */}
                {(() => {
                  const price = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)
                  if (price == null) return null
                  return (
                    <div
                      title={
                        card.is_user_reported
                          ? 'Precio reportado por el usuario'
                          : 'Precio de mercado'
                      }
                      className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30"
                    >
                      {formatPrice(price, card.currency)}
                      {card.is_user_reported ? ' ★' : ''}
                    </div>
                  )
                })()}

                {/* Badge de estado según disponibilidad */}
                <CardStatusBadge
                  status={card.status}
                  marketPrice={card.market_price}
                  priceOverride={card.price_override}
                  isForSale={card.is_for_sale}
                  isForTrade={card.is_for_trade}
                  price={card.price}
                  manualPrice={card.manual_price}
                  reservedUntil={card.reserved_until}
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
                />

                {onRemoveSlot && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveSlot(card.id)
                    }}
                    className="absolute right-1.5 top-9 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    aria-label={`Quitar ${card.card_name}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}

                {onEditCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditCard(card)
                    }}
                    className="absolute left-1/2 top-1.5 -translate-x-1/2 rounded-full bg-binder-accent px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity hover:bg-rose-500 group-hover:opacity-100"
                    aria-label={`Editar ${card.card_name}`}
                  >
                    Editar
                  </button>
                )}

                {onEditCard && onMarkSold && normalizeStatus(card.status) === 'reserved' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (
                        window.confirm(
                          `¿Marcar "${card.card_name}" como vendida? Sale de la venta, se cierra la reserva y podés calificar a la otra parte.`
                        )
                      ) {
                        onMarkSold(card.id)
                      }
                    }}
                    className="absolute left-1.5 top-16 rounded-full bg-emerald-600/90 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity hover:bg-emerald-500 group-hover:opacity-100"
                    aria-label={`Marcar ${card.card_name} como vendida`}
                  >
                    ✔ Vendida
                  </button>
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

      {selected && (
        <CardDetailModal
          card={selected}
          canEdit={!!onEditCard}
          onSaved={onCardUpdated}
          onClose={() => setSelected(null)}
        />
      )}
      {claimCard && seller && (
        <ClaimModal card={claimCard} seller={seller} onClose={() => setClaimCard(null)} />
      )}
    </div>
  )
}
