'use client'

import { memo } from 'react'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
import { PlusIcon, ShareIcon, SparklesIcon } from '@/components/icons'
import type { Currency } from '@/lib/priceGuide'
import type { WantlistCard } from '@/types/wantlist'
import type { Binder } from './CollectionView'

interface WantlistViewProps {
  binder: Binder | null
  wantlist: WantlistCard[]
  wantlistLoading: boolean
  currentSheet: number
  copyWantlistLink: () => Promise<void>
  shareWantlistWhatsApp: () => Promise<void>
  setShowWantlistSearch: (v: boolean) => void
  removeFromWantlist: (id: string) => Promise<void>
  updateWantlistBudget: (id: string, maxBudget: number | null) => Promise<void>
  updateWantlistCurrency: (id: string, currency: Currency) => Promise<void>
}

function WantlistView({
  binder,
  wantlist,
  wantlistLoading,
  currentSheet,
  copyWantlistLink,
  setShowWantlistSearch,
  removeFromWantlist,
  updateWantlistBudget,
  updateWantlistCurrency
}: WantlistViewProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-fuchsia-500/30 shadow-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${binderBackgroundForSheet(currentSheet * 2 + 1, binder?.background)})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090d16]/85 via-[#170b1f]/70 to-[#090d16]/90" />
      <div className="relative z-10 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold text-fuchsia-200">
              ✨ {wantlist.length} carta{wantlist.length !== 1 ? 's' : ''} en tu lista de buscadas
            </p>
            <p className="text-xs text-slate-400">
              Quien tenga estas cartas puede ofrecerte un Swap directo por WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyWantlistLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
            >
              <ShareIcon className="h-4 w-4" /> Compartir buscadas
            </button>
            <button
              onClick={() => setShowWantlistSearch(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
            >
              <PlusIcon width={15} height={15} /> Agregar carta buscada
            </button>
          </div>
        </div>
        {wantlistLoading ? (
          <p className="py-16 text-center text-slate-500">Cargando buscadas…</p>
        ) : wantlist.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fuchsia-500/40 bg-slate-900/80 px-6 py-16 text-center">
            <SparklesIcon className="mx-auto h-8 w-8 text-fuchsia-400" />
            <p className="mt-3 text-lg font-semibold text-white">Tu lista de buscadas está vacía</p>
            <p className="mt-1 text-sm text-slate-500">
              Agregá las cartas que estás buscando para que otros coleccionistas puedan ofrecerte un Swap por WhatsApp.
            </p>
            <button
              onClick={() => setShowWantlistSearch(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
            >
              <PlusIcon width={15} height={15} /> Agregar carta buscada
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {wantlist.map((w) => (
              <WantlistSlot
                key={w.id}
                entry={w}
                owner
                onRemove={removeFromWantlist}
                onBudgetChange={updateWantlistBudget}
                onCurrencyChange={updateWantlistCurrency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(WantlistView)