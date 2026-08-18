'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { SearchIcon, SparklesIcon } from './icons'
import LanguagePills from './LanguagePills'
import {
  CARD_CONDITIONS,
  formatCondition,
  type CardCondition
} from '@/lib/cardCondition'
import type { CardLanguage } from '@/lib/cardLanguage'
import { fetchJson } from '@/lib/utils'
import type { SearchResult } from '@/types'

interface PokedexSearchModalProps {
  title?: string
  showCondition?: boolean
  onClose: () => void
  onSelect: (
    card: SearchResult,
    language: CardLanguage,
    condition: CardCondition | ''
  ) => Promise<void>
}

const ITEM_HEIGHT = 72 // px por resultado (h-14 = 56px img + padding)
const OVERSCAN = 5

export default function PokedexSearchModal({
  title = 'Pokédex · Buscar carta',
  showCondition = true,
  onClose,
  onSelect
}: PokedexSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [language, setLanguage] = useState<CardLanguage>('ES')
  const [condition, setCondition] = useState<CardCondition | ''>('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Búsqueda con debounce
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setFocusedIndex(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    setFocusedIndex(0)
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
    }, 250)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  // TanStack Virtual: virtualiza la lista de resultados
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN
  })

  // Navegación por teclado: ↑↓ para mover, ↵ para seleccionar, Esc para cerrar
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, results.length - 1)
          virtualizer.scrollToIndex(next, { align: 'auto' })
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0)
          virtualizer.scrollToIndex(next, { align: 'auto' })
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < results.length) {
          handleSelect(results[focusedIndex])
        }
      }
    },
    [results, focusedIndex, virtualizer, onClose]
  )

  // Reset focusedIndex cuando cambian los resultados
  useEffect(() => {
    setFocusedIndex(0)
  }, [results.length])

  async function handleSelect(card: SearchResult) {
    if (saving !== null) return
    setSaving(card.id)
    setError(null)
    try {
      await onSelect(card, language, condition)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  const showEmptyState = !loading && !error && query.trim().length < 2
  const showNoResults = !loading && !error && query.trim().length >= 2 && results.length === 0

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="modal-card modal-card--panel-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
      >
        {/* Barra superior estilo Pokédex */}
        <div className="flex items-center gap-3 border-b border-slate-800 bg-gradient-to-r from-rose-600/25 via-fuchsia-600/15 to-slate-900 px-5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-600 shadow-lg shadow-rose-900/40">
            <SparklesIcon className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{title}</h2>
            <p className="text-[11px] text-slate-400">Nombre o set · 100% teclado</p>
          </div>
        </div>

        {/* Input + idioma / estado */}
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscá por nombre, número o set… (ej: charizard · 151)"
              autoFocus
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-rose-500/60 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Idioma
              </p>
              <LanguagePills value={language} onChange={setLanguage} compact />
            </div>
            {showCondition && (
              <div className="min-w-0">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Estado
                </p>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as CardCondition | '')}
                  className="field mt-0.5 w-full min-w-40"
                >
                  <option value="">Sin especificar</option>
                  {CARD_CONDITIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatCondition(c.id) ?? c.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Lista virtualizada de resultados */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {showEmptyState && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Escribí al menos 2 caracteres para buscar en el catálogo.
            </p>
          )}
          {loading && (
            <p className="px-3 py-4 text-sm text-slate-400">Buscando…</p>
          )}
          {error && !loading && (
            <p className="px-3 py-4 text-sm text-red-400">{error}</p>
          )}
          {showNoResults && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Sin resultados para «{query.trim()}»
            </p>
          )}

          {results.length > 0 && (
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto px-2 py-2"
            >
              <div
                style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const card = results[virtualRow.index]
                  const isFocused = virtualRow.index === focusedIndex
                  return (
                    <div
                      key={card.id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(card)}
                        onMouseEnter={() => setFocusedIndex(virtualRow.index)}
                        disabled={saving !== null}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-left outline-none transition-colors ${
                          isFocused
                            ? 'bg-rose-500/15 text-white'
                            : 'text-slate-200 hover:bg-slate-800/50'
                        } ${saving !== null ? 'opacity-50' : ''}`}
                      >
                        <img
                          src={card.image}
                          alt=""
                          className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                          loading="lazy"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{card.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {card.set_name} · #{card.number}
                          </span>
                        </span>
                        {card.rarity && (
                          <span className="shrink-0 rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            {card.rarity}
                          </span>
                        )}
                        {saving === card.id && (
                          <span className="shrink-0 text-xs text-slate-400">Guardando…</span>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pie: atajos de teclado */}
        <div className="flex items-center gap-4 border-t border-slate-800 px-5 py-2.5 text-[11px] text-slate-500">
          <span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">↑↓</kbd>{' '}
            navegar
          </span>
          <span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">↵</kbd>{' '}
            agregar
          </span>
          <span>
            <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">esc</kbd>{' '}
            cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
