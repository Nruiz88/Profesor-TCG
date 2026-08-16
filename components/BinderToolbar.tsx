'use client'

import { useState } from 'react'
import { ArrowRightIcon, SearchIcon, SwapIcon, TagIcon, XIcon } from './icons'
import { ENERGY_TYPES, TypeIcon } from './TypeIcon'

interface BinderToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  saleOnly: boolean
  onToggleSale: () => void
  tradeOnly: boolean
  onToggleTrade: () => void
  typeFilter: string | null
  onTypeChange: (type: string | null) => void
  pageCount: number
  currentPage: number // 0-based
  onJumpPage: (page: number) => void // 1-based
  shownCount: number
  totalCount: number
}

// Barra de herramientas del visor: buscador en tiempo real (nombre o número),
// filtro por tipo de energía (Pokédex style), filtros de disponibilidad
// (en venta / para cambio) y salto directo a página.
export default function BinderToolbar({
  search,
  onSearchChange,
  saleOnly,
  onToggleSale,
  tradeOnly,
  onToggleTrade,
  typeFilter,
  onTypeChange,
  pageCount,
  currentPage,
  onJumpPage,
  shownCount,
  totalCount
}: BinderToolbarProps) {
  const [jumpInput, setJumpInput] = useState('')
  const hasFilters =
    search.trim() !== '' || saleOnly || tradeOnly || typeFilter !== null

  function handleJump() {
    const n = parseInt(jumpInput, 10)
    if (!Number.isNaN(n) && n >= 1) {
      onJumpPage(n)
      setJumpInput('')
    }
  }

  return (
    <div className="mb-6 rounded-3xl border border-slate-800/90 bg-slate-900/40 p-4 backdrop-blur-xl">
      {/* Buscador + salto a página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscá por nombre de carta o número de colección…"
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            aria-label="Buscar carta en el binder"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Ir a página</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            className="w-16 rounded-xl border border-slate-800 bg-slate-950/80 px-2.5 py-2 text-sm text-white focus:border-rose-500/50 focus:outline-none"
            aria-label="Número de página"
          />
          <button
            onClick={handleJump}
            className="flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            aria-label="Ir a la página"
          >
            Ir
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
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
                className={`flex shrink-0 items-center gap-1.5 rounded-xl border bg-slate-950 px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'scale-105 ring-2 ring-rose-500/60 ' + t.borderClass.replace('border-', 'border-')
                    : t.borderClass + ' text-slate-300 hover:border-slate-500'
                }`}
                aria-pressed={active}
              >
                <TypeIcon type={t.id} small />
                <span className={active ? 'text-white' : ''}>{t.label}</span>
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
                onSearchChange('')
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
