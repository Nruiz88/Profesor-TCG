'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SlotCard } from '@/lib/sheets'
import PokemonCard from '@/components/PokemonCard'
import CardStatusBadge from '@/components/CardStatusBadge'
import LanguageBadge from '@/components/LanguageBadge'
import ConditionBadge from '@/components/ConditionBadge'
import { effectivePrice, normalizeStatus } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import { GripVerticalIcon } from '@/components/icons'

interface SortableSlotProps {
  slot: SlotCard | null
  slotIndex: number
  isEditing: boolean
  onRemoveSlot?: (slotId: string) => void
  onEmptySlotClick?: (slotIndex: number) => void
  onEditCard?: (card: SlotCard) => void
  onMarkSold?: (cardId: string) => void
  onCardClick?: (card: SlotCard) => void
  highlightCardId?: string | null
}

export default function SortableSlot({
  slot,
  slotIndex,
  isEditing,
  onRemoveSlot,
  onEmptySlotClick,
  onEditCard,
  onMarkSold,
  onCardClick,
  highlightCardId
}: SortableSlotProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: slot?.id ?? `empty-${slotIndex}`,
    disabled: !isEditing || !slot
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-[63/88] rounded-xl ${
        isDragging
          ? 'ring-2 ring-dashed ring-fuchsia-400/80 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
          : ''
      }`}
      {...attributes}
    >
      {slot ? (
        <div className="relative h-full w-full">
          {/* Handle de arrastre (solo en modo edición) */}
          {isEditing && (
            <button
              {...listeners}
              className="absolute left-1/2 top-1 z-20 -translate-x-1/2 cursor-grab touch-none rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-fuchsia-400 active:cursor-grabbing"
              aria-label="Arrastrar para reordenar"
            >
              <GripVerticalIcon className="inline h-3 w-3" />
            </button>
          )}

          <div
            role="button"
            tabIndex={0}
            onClick={() => onCardClick?.(slot)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCardClick?.(slot)
            }}
            data-card-id={slot.id}
            className={`h-full w-full cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-binder-accent ${
              slot.id === highlightCardId
                ? 'ring-2 ring-yellow-400 shadow-[0_0_0_4px_rgba(250,204,21,0.25)]'
                : ''
            }`}
            aria-label={`Ver detalle de ${slot.card_name}`}
          >
            <PokemonCard card={slot} />
          </div>

          <LanguageBadge
            language={slot.language}
            className="absolute left-1.5 top-1.5"
          />

          <ConditionBadge
            condition={slot.condition}
            className="absolute left-1.5 top-9"
          />

          {(() => {
            const price = effectivePrice(slot.market_price, slot.price_override, slot.price)
            if (price == null) return null
            return (
              <div
                title={
                  slot.is_user_reported
                    ? 'Precio reportado por el usuario'
                    : 'Precio de mercado'
                }
                className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30"
              >
                {formatPrice(price, slot.currency)}
                {slot.is_user_reported ? ' ★' : ''}
              </div>
            )
          })()}

          <CardStatusBadge
            status={slot.status}
            marketPrice={slot.market_price}
            priceOverride={slot.price_override}
            isForSale={slot.is_for_sale}
            isForTrade={slot.is_for_trade}
            price={slot.price}
            reservedUntil={slot.reserved_until}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap"
          />

          {onRemoveSlot && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemoveSlot(slot.id)
              }}
              className="absolute right-1.5 top-9 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
              aria-label={`Quitar ${slot.card_name}`}
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
                onEditCard(slot)
              }}
              className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-binder-accent px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity hover:bg-rose-500 group-hover:opacity-100"
              aria-label={`Editar ${slot.card_name}`}
            >
              Editar
            </button>
          )}

          {onEditCard && onMarkSold && normalizeStatus(slot.status) === 'reserved' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (
                  window.confirm(
                    `¿Marcar "${slot.card_name}" como vendida? Sale de la venta, se cierra la reserva y podés calificar a la otra parte.`
                  )
                ) {
                  onMarkSold(slot.id)
                }
              }}
              className="absolute left-1.5 top-16 rounded-full bg-emerald-600/90 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity hover:bg-emerald-500 group-hover:opacity-100"
              aria-label={`Marcar ${slot.card_name} como vendida`}
            >
              ✔ Vendida
            </button>
          )}
        </div>
      ) : onEmptySlotClick ? (
        <button
          type="button"
          onClick={() => onEmptySlotClick(slotIndex)}
          className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-800/30 transition-colors hover:border-slate-600 hover:bg-slate-800/50"
          aria-label={`Agregar carta al bolsillo ${slotIndex + 1}`}
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
  )
}
