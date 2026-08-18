'use client'

import { useEffect, useRef, useState } from 'react'
import { Command } from 'cmdk'
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
  const [condition, setCondition] = useState<CardCondition | '' >('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

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

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="modal-card modal-card--panel-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <Command shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col">
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
              <Command.Input
                value={query}
                onValueChange={setQuery}
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
                <LanguagePills value={language} onChange={setLanguage} />
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

          {/* Lista de resultados (navegación con ↑↓ y ↵) */}
          <Command.List className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {!loading && !error && query.trim().length < 2 && (
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
            {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">
                Sin resultados para «{query.trim()}»
              </p>
            )}

            {results.map((card) => (
              <Command.Item
                key={card.id}
                value={card.id}
                onSelect={() => handleSelect(card)}
                disabled={saving !== null}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none data-[selected=true]:bg-rose-500/15 data-[selected=true]:text-white"
              >
                <img
                  src={card.image}
                  alt=""
                  className="h-14 w-10 shrink-0 rounded-md object-cover ring-1 ring-white/10"
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
              </Command.Item>
            ))}
          </Command.List>

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
        </Command>
      </div>
    </div>
  )
}
