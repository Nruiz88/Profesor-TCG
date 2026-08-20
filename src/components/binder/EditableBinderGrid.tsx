'use client'

import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay as DragOverlayComponent
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import type { SlotCard } from '@/lib/sheets'
import SortableSlot from './SortableSlot'
import PokemonCard from '@/components/PokemonCard'
import CardDetailModal from '@/components/CardDetailModal'
import ClaimModal from '@/components/ClaimModal'
import { normalizeStatus } from '@/lib/cardStatus'
import type { SellerInfo } from '@/components/SellerInfoBadge'

interface EditableBinderGridProps {
  sheetNumber: number
  slots: (SlotCard | null)[]
  isEditing: boolean
  onRemoveSlot?: (slotId: string) => void
  onEmptySlotClick?: (slotIndex: number) => void
  onEditCard?: (card: SlotCard) => void
  onMarkSold?: (cardId: string) => void
  onCardUpdated?: () => void
  onReorder?: (newSlots: (SlotCard | null)[]) => void
  seller?: SellerInfo | null
  highlightCardId?: string | null
  onToggleFeatured?: (cardId: string, isFeatured: boolean) => void
  onFetchPrice?: (card: SlotCard) => void
  fetchingPriceId?: string | null
}

export default function EditableBinderGrid({
  sheetNumber,
  slots,
  isEditing,
  onRemoveSlot,
  onEmptySlotClick,
  onEditCard,
  onMarkSold,
  onCardUpdated,
  onReorder,
  seller,
  highlightCardId,
  onToggleFeatured,
  onFetchPrice,
  fetchingPriceId
}: EditableBinderGridProps) {
  const [selected, setSelected] = useState<SlotCard | null>(null)
  const [claimCard, setClaimCard] = useState<SlotCard | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Sensores: Mouse con 5px de tolerancia, Touch con 150ms press delay
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 }
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 }
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  // IDs únicos para SortableContext (los empty slots usan un prefijo)
  const itemIds = useMemo(
    () => slots.map((s, i) => s?.id ?? `empty-${i}`),
    [slots]
  )

  const activeCard = useMemo(
    () => (activeId ? slots.find((s) => s?.id === activeId) ?? null : null),
    [activeId, slots]
  )

  function handleCardClick(card: SlotCard) {
    if (onEditCard) {
      // En el binder propio el click abre directamente el editor completo.
      onEditCard(card)
      return
    }
    const s = normalizeStatus(card.status)
    if (s === 'for_sale' || s === 'for_trade') {
      setClaimCard(card)
      return
    }
    setSelected(card)
  }

  function handleDragStart(event: { active: { id: string | number } }) {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeStr = String(active.id)
    const overStr = String(over.id)

    const oldIndex = slots.findIndex(
      (s, i) => (s?.id ?? `empty-${i}`) === activeStr
    )
    const newIndex = slots.findIndex(
      (s, i) => (s?.id ?? `empty-${i}`) === overStr
    )

    if (oldIndex === -1 || newIndex === -1) return

    const newSlots = arrayMove(slots, oldIndex, newIndex)
    onReorder?.(newSlots)
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Hoja {sheetNumber}
        </h3>
        <div className="flex items-center gap-2">
          {isEditing && (
            <span className="text-[10px] font-semibold text-fuchsia-400">
              ✋ Arrastrá para reordenar
            </span>
          )}
          <span className="text-xs font-medium text-slate-600">
            {slots.filter(Boolean).length}/9
          </span>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {slots.map((card, i) => (
              <SortableSlot
                key={itemIds[i]}
                slot={card}
                slotIndex={i}
                isEditing={isEditing}
                onRemoveSlot={onRemoveSlot}
                onEmptySlotClick={onEmptySlotClick}
                onEditCard={onEditCard}
                onMarkSold={onMarkSold}
                onCardClick={handleCardClick}
                highlightCardId={highlightCardId}
                onToggleFeatured={onToggleFeatured}
                onFetchPrice={onFetchPrice}
                fetchingPrice={fetchingPriceId === card?.id}
              />
            ))}
          </div>
        </SortableContext>

        {/* Overlay visual premium: carta flotante con sombra y rotación */}
        <DragOverlayComponent dropAnimation={null}>
          {activeCard ? (
            <div className="w-[100px] rotate-2 scale-105 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-2 ring-fuchsia-400/60 sm:w-[120px]">
              <PokemonCard card={activeCard} />
            </div>
          ) : null}
        </DragOverlayComponent>
      </DndContext>

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
