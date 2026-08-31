'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { padSheet, type SlotCard } from '@/lib/sheets'
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
import type { Profile } from '@/lib/profile'

export interface Binder {
  id: string
  title: string
  description?: string | null
  is_public?: boolean
  cover_card_id?: string | null
  slug?: string | null
  background?: string | null
  created_at?: string
}

const EditableBinderGrid = dynamic(() => import('@/components/binder/EditableBinderGrid'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-[63/88] animate-pulse rounded-xl bg-slate-800/50" />
        ))}
      </div>
    </div>
  )
})

interface CollectionViewProps {
  binder: Binder | null
  filteredCards: SlotCard[]
  query: string
  sheets: SlotCard[][]
  currentSheet: number
  setCurrentSheet: (n: number) => void
  isEditing: boolean
  fetchingPriceId: string | null
  profile: Profile | null
  fetchCardPrice: (card: SlotCard) => Promise<void>
  handleReorder: (sheetIndex: number, newSlots: (SlotCard | null)[]) => void
  handleToggleFeatured: (cardId: string, isFeatured: boolean) => Promise<void>
  removeSlot: (slotId: string) => Promise<void>
  markCardSold: (cardId: string) => Promise<void>
  setSlotTarget: (v: { sheetIndex: number; slotIndex: number } | null) => void
  setEditCard: (c: SlotCard | null) => void
}

function CollectionView({
  binder,
  filteredCards,
  query,
  sheets,
  currentSheet,
  setCurrentSheet,
  isEditing,
  fetchingPriceId,
  fetchCardPrice,
  handleReorder,
  handleToggleFeatured,
  removeSlot,
  markCardSold,
  setSlotTarget,
  setEditCard
}: CollectionViewProps) {
  if (query.trim() !== '' && filteredCards.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-white">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-500">Ninguna carta coincide con la búsqueda.</p>
      </div>
    )
  }

  const spreadCount = Math.max(1, Math.ceil(sheets.length / 2))

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/70 shadow-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${binderBackgroundForSheet(currentSheet * 2 + 1, binder?.background)})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090d16]/80 via-transparent to-[#090d16]/90" />
      <div className="relative z-10 flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-4 py-6 binder-scroll">
        {[0, 1].map((offset) => {
          const sheetIndex = currentSheet * 2 + offset
          const sheetCards = sheets[sheetIndex]
          const currentSlots = sheetCards ? padSheet(sheetCards) : Array(9).fill(null)
          return (
            <div key={sheetIndex} className="flex min-w-[calc(100%-2rem)] snap-center flex-col gap-3 md:min-w-[calc(50%-1rem)]">
              <div className="flex items-center justify-between px-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-md">Hoja {sheetIndex + 1}</h3>
                <span className="rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-slate-400">{currentSlots.filter(Boolean).length}/9</span>
              </div>
              <EditableBinderGrid
                sheetNumber={sheetIndex + 1}
                slots={currentSlots}
                isEditing={isEditing}
                onRemoveSlot={removeSlot}
                onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
                onEditCard={setEditCard}
                onMarkSold={markCardSold}
                onCardUpdated={() => {}}
                onReorder={(newSlots) => handleReorder(sheetIndex, newSlots)}
                onToggleFeatured={handleToggleFeatured}
                onFetchPrice={fetchCardPrice}
                fetchingPriceId={fetchingPriceId}
                background={binder?.background}
              />
            </div>
          )
        })}
      </div>
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-800 bg-slate-950/90 px-5 py-1.5">
        <button
          onClick={() => setCurrentSheet(Math.max(0, currentSheet - 1))}
          disabled={currentSheet === 0}
          className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30"
          aria-label="Hoja anterior"
        >
          ‹
        </button>
        <span className="font-mono text-xs font-semibold text-slate-300">
          {currentSheet + 1} / {spreadCount}
        </span>
        <button
          onClick={() => setCurrentSheet(Math.min(spreadCount - 1, currentSheet + 1))}
          disabled={currentSheet >= spreadCount - 1}
          className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30"
          aria-label="Hoja siguiente"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default memo(CollectionView)