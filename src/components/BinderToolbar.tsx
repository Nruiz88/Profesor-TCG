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
  /** Abre el buscador Pokédex (cmdk) para agregar cartas al binder. */
  onOpenSearch: () => void
}

// Barra de herramientas del binder: el buscador abre el modal Pokédex (cmdk)
// para agregar cartas al catálogo y los filtros del visor (tipo de energía +
// disponibilidad). La paginación vive en SheetPagination.
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
    <div className="mb-6 rounded-3xl border border-slate-800/90 bg-slate-900/40 p-4 backdrop-blur-xl">
      {/* Buscador del catálogo: abre el modal Pokédex (cmdk) */}
      <div className="relative">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-4 pr-3 text-left transition-colors hover:border-rose-500/50"
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-rose-500" />
          <span className="flex-1 truncate text-sm text-slate-500">
            Buscá la carta que querés agregar (nombre, número o set)…
          </span>
          <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-mono text-slate-400 sm:flex">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Fila de tipos de energía (Pokédex style) */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Tipo de energía
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onTypeChange(null)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
              typeFilter === null
                ? 'border-rose-500/60 bg-rose-500/15 text-rose-300 ring-2 ring-rose-500/40'
                : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
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
                aria-label={t.label}
                className={`flex shrink-0 items-center justify-center rounded-xl border bg-slate-950 p-2 transition-all ${
                  active
                    ? 'scale-105 ring-2 ring-rose-500/60 ' + t.borderClass
                    : t.borderClass + ' hover:brightness-125'
                }`}
                aria-pressed={active}
              >
                <TypeIcon type={t.id} lg />
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {/* Filtros de disponibilidad */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-1">
          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
              saleOnly ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <input
              type="checkbox"
              checked={saleOnly}
              onChange={onToggleSale}
              className="h-4 w-4 rounded border-slate-600 accent-emerald-500"
            />
            <TagIcon className="h-3.5 w-3.5" />
            En venta
          </label>
          <label
            className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
              tradeOnly ? 'bg-sky-600/20 text-sky-300' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <input
              type="checkbox"
              checked={tradeOnly}
              onChange={onToggleTrade}
              className="h-4 w-4 rounded border-slate-600 accent-sky-500"
            />
            <SwapIcon className="h-3.5 w-3.5" />
            Para cambio
          </label>
          {hasFilters && (
            <button
              onClick={() => {
                if (saleOnly) onToggleSale()
                if (tradeOnly) onToggleTrade()
                if (typeFilter !== null) onTypeChange(null)
              }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <XIcon className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {shownCount === totalCount
            ? `${totalCount} cartas`
            : `${shownCount} de ${totalCount} cartas`}
        </p>
      </div>
    </div>
  )
}
