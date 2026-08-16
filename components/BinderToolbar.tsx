'use client'

import { useState } from 'react'
import { ArrowRightIcon, SearchIcon, SwapIcon, TagIcon, XIcon } from './icons'

interface BinderToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  saleOnly: boolean
  onToggleSale: () => void
  tradeOnly: boolean
  onToggleTrade: () => void
  pageCount: number
  currentPage: number // 0-based
  onJumpPage: (page: number) => void // 1-based
  shownCount: number
  totalCount: number
}

// Barra de herramientas del visor: buscador en tiempo real (nombre o número),
// filtros de disponibilidad (en venta / para cambio) y salto directo a página.
export default function BinderToolbar({
  search,
  onSearchChange,
  saleOnly,
  onToggleSale,
  tradeOnly,
  onToggleTrade,
  pageCount,
  currentPage,
  onJumpPage,
  shownCount,
  totalCount
}: BinderToolbarProps) {
  const [jumpInput, setJumpInput] = useState('')
  const hasFilters = search.trim() !== '' || saleOnly || tradeOnly

  function handleJump() {
    const n = parseInt(jumpInput, 10)
    if (!Number.isNaN(n) && n >= 1) {
      onJumpPage(n)
      setJumpInput('')
    }
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Buscador */}
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre o número de colección…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            aria-label="Buscar carta en el binder"
          />
        </div>

        {/* Salto a página */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Ir a página</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            className="w-16 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white focus:border-binder-accent focus:outline-none"
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Filtros de disponibilidad */}
        <div className="flex items-center gap-3">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              saleOnly ? 'bg-emerald-600/15 text-emerald-300' : 'text-slate-300 hover:bg-slate-800'
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
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
              tradeOnly ? 'bg-sky-600/15 text-sky-300' : 'text-slate-300 hover:bg-slate-800'
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
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <XIcon className="h-3.5 w-3.5" />
              Limpiar filtros
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
