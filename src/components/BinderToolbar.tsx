'use client'

import { SearchIcon, SwapIcon, TagIcon, XIcon } from './icons'
import { ENERGY_TYPES, TypeIcon } from './TypeIcon'

interface BinderToolbarProps {
  saleOnly: boolean
  onToggleSale: () => void
  tradeOnly: boolean
  onToggleTrade: () => void
  typeFilter: string | null
  onTypeChange: (type: string | null) => void
  shownCount: number
  totalCount: number
  onOpenSearch: () => void
}

export default function BinderToolbar({
  saleOnly,
  onToggleSale,
  tradeOnly,
  onToggleTrade,
  typeFilter,
  onTypeChange,
  shownCount,
  totalCount,
  onOpenSearch
}: BinderToolbarProps) {
  const hasFilters = saleOnly || tradeOnly || typeFilter !== null

  return (
    <div className="w-full min-w-0 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 backdrop-blur-xl">
      {/* Row 1: Search + availability filters — en una sola línea */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Buscador */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-3 pr-2 text-left transition-colors hover:border-rose-500/40 sm:flex-none sm:basis-0 sm:min-w-[240px]"
        >
          <SearchIcon className="h-3.5 w-3.5 shrink-0 text-rose-500/70" />
          <span className="flex-1 truncate text-xs text-slate-500">Agregar carta…</span>
          <span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 sm:flex">
            ⌘K
          </span>
        </button>

        {/* Filtros de disponibilidad — pills compactos */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800/80 bg-slate-950/80 p-0.5">
          <button
            onClick={onToggleSale}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              saleOnly ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <TagIcon className="h-3 w-3" />
            Venta
          </button>
          <button
            onClick={onToggleTrade}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              tradeOnly ? 'bg-sky-600/20 text-sky-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <SwapIcon className="h-3 w-3" />
            Cambio
          </button>
          {hasFilters && (
            <button
              onClick={() => {
                if (saleOnly) onToggleSale()
                if (tradeOnly) onToggleTrade()
                if (typeFilter !== null) onTypeChange(null)
              }}
              className="flex items-center rounded-lg px-1.5 py-1.5 text-slate-600 transition-colors hover:text-white"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Contador */}
        <p className="text-[11px] text-slate-600">
          {shownCount === totalCount ? totalCount : `${shownCount}/${totalCount}`}
        </p>
      </div>

      {/* Row 2: Energy types — solo si hay cartas */}
      {totalCount > 0 && (
        <div className="mt-2 flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onTypeChange(null)}
            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-all ${
              typeFilter === null
                ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'
                : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-600'
            }`}
          >
            Todas
          </button>
          {ENERGY_TYPES.map((t) => {
            const active = typeFilter === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTypeChange(active ? null : t.id)}
                title={t.label}
                className={`flex shrink-0 items-center justify-center rounded-lg border bg-slate-950 p-1.5 transition-all ${
                  active
                    ? 'scale-110 ring-1 ring-rose-500/50 ' + t.borderClass
                    : t.borderClass + ' hover:brightness-125'
                }`}
              >
                <TypeIcon type={t.id} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
