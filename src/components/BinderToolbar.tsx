'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon, SearchIcon, SwapIcon, TagIcon, XIcon } from './icons'
import { ENERGY_TYPES, TypeIcon } from './TypeIcon'
import LanguagePills from './LanguagePills'
import SearchResultCard from './SearchResultCard'
import { fetchJson, SessionExpiredError } from '@/lib/utils'
import type { SearchResult } from '@/types'
import type { CardLanguage } from '@/lib/cardLanguage'

interface BinderToolbarProps {
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
  /** Agrega una carta del catálogo al binder (en el bolsillo vacío más próximo) */
  onAddCard: (card: SearchResult, language: CardLanguage) => Promise<void>
}

// Barra de herramientas del binder: buscador del catálogo completo (nombre o
// número) que agrega directo al bolsillo vacío más próximo, filtros del visor
// (tipo de energía + disponibilidad) y salto directo a página.
export default function BinderToolbar({
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
  totalCount,
  onAddCard
}: BinderToolbarProps) {
  const [jumpInput, setJumpInput] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<CardLanguage>('ES')
  const [saving, setSaving] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFilters = saleOnly || tradeOnly || typeFilter !== null

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    timerRef.current = setTimeout(async () => {
      try {
        const data = await fetchJson<{ results: SearchResult[] }>(
          `/api/search?q=${encodeURIComponent(q)}`
        )
        setResults(data.results || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al buscar')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  async function handleAdd(card: SearchResult) {
    if (saving !== null) return
    setSaving(card.id)
    setError(null)
    try {
      await onAddCard(card, language)
      setQuery('')
      setResults([])
      setOpen(false)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        // Sesión vencida: volvé a login para renovarla y seguí en el binder
        window.location.assign('/login?next=/binder')
        return
      }
      setError(err instanceof Error ? err.message : 'Error al agregar la carta')
    } finally {
      setSaving(null)
    }
  }

  function handleJump() {
    const n = parseInt(jumpInput, 10)
    if (!Number.isNaN(n) && n >= 1) {
      onJumpPage(n)
      setJumpInput('')
    }
  }

  return (
    <div className="mb-6 rounded-3xl border border-slate-800/90 bg-slate-900/40 p-4 backdrop-blur-xl">
      {/* Buscador del catálogo + salto a página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0] && saving === null) {
                e.preventDefault()
                handleAdd(results[0])
              }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Buscá la carta que querés agregar (nombre o número)…"
            aria-label="Buscar carta en el catálogo para agregar al binder"
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults([])
                setOpen(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition-colors hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <XIcon width={15} height={15} />
            </button>
          )}

          {/* Dropdown de resultados del catálogo */}
          {open && query.trim().length >= 2 && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 right-0 top-full z-30 mt-2 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                {loading ? (
                  <p className="px-4 py-4 text-sm text-slate-400">Buscando…</p>
                ) : error ? (
                  <p className="px-4 py-4 text-sm text-red-400">{error}</p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-500">
                    Sin resultados para «{query.trim()}»
                  </p>
                ) : (
                  <>
                    <div className="max-h-[55vh] overflow-y-auto p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {results.map((card) => (
                          <SearchResultCard
                            key={card.id}
                            card={card}
                            busy={saving === card.id}
                            disabled={saving !== null}
                            actionLabel="Agregar"
                            busyLabel="Agregando…"
                            onSelect={handleAdd}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-slate-800 p-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        Idioma de tu copia
                      </p>
                      <LanguagePills value={language} onChange={setLanguage} compact />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
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
