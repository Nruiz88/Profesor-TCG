'use client'

import { memo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReservedClaimsBanner from '@/components/ReservedClaimsBanner'
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
import { CardsIcon, PlusIcon, ShareIcon, SparklesIcon, TrashIcon } from '@/components/icons'
import { effectivePrice, type Availability } from '@/lib/cardStatus'
import type { Currency } from '@/lib/priceGuide'
import type { CardCondition } from '@/lib/cardCondition'
import type { SlotCard } from '@/lib/sheets'
import type { Profile } from '@/lib/profile'
import type { SearchResult } from '@/types'
import type { CardLanguage } from '@/lib/cardLanguage'
import type { WantlistCard } from '@/types/wantlist'
import CollectionView, { type Binder } from './CollectionView'
import WantlistView from './WantlistView'

export interface BinderContentProps {
  binder: Binder | null
  cards: SlotCard[]
  loading: boolean
  tab: 'collection' | 'wantlist'
  setTab: (t: 'collection' | 'wantlist') => void
  query: string
  setQuery: (q: string) => void
  message: string | null
  setMessage: (m: string | null) => void
  currentSheet: number
  setCurrentSheet: (n: number) => void
  sheets: SlotCard[][]
  filteredCards: SlotCard[]
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (v: boolean) => void
  pendingOrder: (SlotCard | null)[] | null
  setPendingOrder: (v: (SlotCard | null)[] | null) => void
  fetchingPriceId: string | null
  slotTarget: { sheetIndex: number; slotIndex: number } | null
  setSlotTarget: (v: { sheetIndex: number; slotIndex: number } | null) => void
  editCard: SlotCard | null
  setEditCard: (c: SlotCard | null) => void
  requireProfileFor: Availability | null
  setRequireProfileFor: (v: Availability | null) => void
  showPokedex: boolean
  setShowPokedex: (v: boolean) => void
  showWantlistSearch: boolean
  setShowWantlistSearch: (v: boolean) => void
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  wantlist: WantlistCard[]
  wantlistLoading: boolean
  totalCards: number
  saleCount: number
  tradeCount: number
  totalValue: number
  fmtValue: (n: number) => string
  binderSets: { set_id: string; count: number }[]
  selectBinder: (id: string) => Promise<void>
  copyShareLink: () => Promise<void>
  copyWantlistLink: () => Promise<void>
  shareBinderWhatsApp: () => Promise<void>
  shareWantlistWhatsApp: () => Promise<void>
  openShareImage: () => Promise<void>
  togglePublic: () => Promise<void>
  handleDeleteBinder: () => Promise<void>
  cancelEdit: () => void
  saveOrder: () => Promise<void>
  fetchCardPrice: (card: SlotCard) => Promise<void>
  handleReorder: (sheetIndex: number, newSlots: (SlotCard | null)[]) => void
  handleToggleFeatured: (cardId: string, isFeatured: boolean) => Promise<void>
  removeSlot: (slotId: string) => Promise<void>
  markCardSold: (cardId: string) => Promise<void>
  addCardToSlot: (card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) => Promise<void>
  addCardToNearestSlot: (card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) => Promise<void>
  addToWantlist: (card: SearchResult) => Promise<void>
  removeFromWantlist: (id: string) => Promise<void>
  updateWantlistBudget: (id: string, maxBudget: number | null) => Promise<void>
  updateWantlistCurrency: (id: string, currency: Currency) => Promise<void>
  onOpenSettings: () => void
}

function BinderContent({
  binder, cards, loading, tab, setTab, query, setQuery, message, setMessage,
  currentSheet, setCurrentSheet, sheets, filteredCards, isEditing, setIsEditing,
  hasUnsavedChanges, setHasUnsavedChanges, pendingOrder, setPendingOrder, fetchingPriceId, slotTarget, setSlotTarget,
  editCard, setEditCard, requireProfileFor, setRequireProfileFor, showPokedex, setShowPokedex,
  showWantlistSearch, setShowWantlistSearch, profile, setProfile, wantlist, wantlistLoading,
  totalCards, saleCount, tradeCount, totalValue, fmtValue, binderSets,
  selectBinder, copyShareLink, copyWantlistLink, shareBinderWhatsApp, shareWantlistWhatsApp,
  openShareImage, togglePublic, handleDeleteBinder, cancelEdit, saveOrder,
  fetchCardPrice, handleReorder, handleToggleFeatured, removeSlot, markCardSold,
  addCardToSlot, addCardToNearestSlot, addToWantlist, removeFromWantlist,
  updateWantlistBudget, updateWantlistCurrency, onOpenSettings
}: BinderContentProps) {
  const router = useRouter()

  function handleTabChange(nextTab: 'collection' | 'wantlist') {
    setTab(nextTab)
    if (binder?.id) {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', nextTab)
      router.replace(`/binder?${params.toString()}`, { scroll: false })
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Active Binder Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-slate-950 bg-no-repeat bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${binderBackgroundForSheet(1, binder?.background)})` }}
        />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/binder')}
              className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
              title="Volver a mis binders"
            >
              ←
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-white">
                  {binder?.title ?? 'Cargando binder...'}
                </h2>
                <button
                  onClick={togglePublic}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    binder?.is_public
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                  title="Cambiar visibilidad público/privado"
                >
                  {binder?.is_public ? '🌐 Público' : '🔒 Privado'}
                </button>
              </div>
              {binder?.description && (
                <p className="mt-0.5 truncate text-xs text-slate-400">{binder.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{totalCards} cartas</span>
                {totalValue > 0 && <span>· ~${fmtValue(totalValue)} USD</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenSettings}
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px] text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              title="Personalizar el binder"
            >
              <span className="inline-flex h-full w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950/60 px-3 py-1.5 transition-colors group-hover:bg-transparent">
                <SparklesIcon className="h-3.5 w-3.5 text-fuchsia-300" />
                Personalizar
              </span>
            </button>
            <button
              onClick={openShareImage}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-3 py-1.5 text-xs font-semibold text-[#00ffcc] transition-colors hover:bg-[#00ffcc]/20"
            >
              <ShareIcon className="h-3.5 w-3.5" /> Compartir
            </button>
            <button
              onClick={handleDeleteBinder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
              title="Eliminar binder"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Binder Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => handleTabChange('collection')}
            aria-pressed={tab === 'collection'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${tab === 'collection' ? 'bg-[#00ffcc]/15 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
          >
            <CardsIcon className="h-4 w-4" /> Mi Colección
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('wantlist')}
            aria-pressed={tab === 'wantlist'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${tab === 'wantlist' ? 'bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
          >
            <SparklesIcon className="h-4 w-4" /> Cartas Buscadas
            {wantlist.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${tab === 'wantlist' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-400'}`}>
                {wantlist.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en colección…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-8 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-[#00ffcc]/50 focus:ring-1 focus:ring-[#00ffcc]/40"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
          {tab === 'collection' ? (
            <>
              <button
                onClick={() => setShowPokedex(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#00ffcc] px-3.5 py-2 text-sm font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all hover:brightness-110"
              >
                <PlusIcon width={15} height={15} /> Agregar carta
              </button>
              <button
                onClick={() => { if (isEditing) cancelEdit(); else setIsEditing(true) }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${isEditing ? 'bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.25)] hover:bg-fuchsia-400' : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'}`}
              >
                {isEditing ? '✋ Terminar edición' : '✏️ Editar orden'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowWantlistSearch(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-sm font-bold text-white shadow-[0_0_12px_rgba(217,70,239,0.25)] transition-all hover:bg-fuchsia-400"
            >
              <PlusIcon width={15} height={15} /> Agregar carta
            </button>
          )}
        </div>
      </div>

      <ReservedClaimsBanner cards={cards} onShowClaims={() => {}} />

      {isEditing && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3.5 py-2 text-xs text-fuchsia-200">
          <span>💡 <strong>Modo edición activo:</strong> En celular mantené presionada una carta 1 segundo para moverla.</span>
          <button onClick={cancelEdit} className="shrink-0 font-bold underline hover:text-white">Terminar</button>
        </div>
      )}

      {binder && !binder.is_public && cards.some((c) => c.is_for_sale || c.is_for_trade) && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-300/80">
            {cards.filter((c) => c.is_for_sale || c.is_for_trade).length} carta{cards.filter((c) => c.is_for_sale || c.is_for_trade).length !== 1 ? 's' : ''} en marketplace · binder privado
          </p>
          <button
            onClick={togglePublic}
            className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            Hacer público
          </button>
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      )}

      {/* ── Main View: Loading state or Tab Content ── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[63/88] animate-pulse rounded-xl bg-slate-800/50" />
            ))}
          </div>
        </div>
      ) : tab === 'collection' ? (
        <CollectionView
          binder={binder}
          filteredCards={filteredCards}
          query={query}
          sheets={sheets}
          currentSheet={currentSheet}
          setCurrentSheet={setCurrentSheet}
          isEditing={isEditing}
          fetchingPriceId={fetchingPriceId}
          profile={profile}
          fetchCardPrice={fetchCardPrice}
          handleReorder={handleReorder}
          handleToggleFeatured={handleToggleFeatured}
          removeSlot={removeSlot}
          markCardSold={markCardSold}
          setSlotTarget={setSlotTarget}
          setEditCard={setEditCard}
        />
      ) : (
        <WantlistView
          binder={binder}
          wantlist={wantlist}
          wantlistLoading={wantlistLoading}
          currentSheet={currentSheet}
          copyWantlistLink={copyWantlistLink}
          shareWantlistWhatsApp={shareWantlistWhatsApp}
          setShowWantlistSearch={setShowWantlistSearch}
          removeFromWantlist={removeFromWantlist}
          updateWantlistBudget={updateWantlistBudget}
          updateWantlistCurrency={updateWantlistCurrency}
        />
      )}
    </div>
  )
}

export default memo(BinderContent)