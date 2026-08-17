'use client'

import { useEffect, useRef, useState } from 'react'
import LanguagePills from './LanguagePills'
import SearchResultCard from './SearchResultCard'
import type { CardLanguage } from '@/lib/cardLanguage'
import type { SearchResult } from '@/types'

interface SlotSearchModalProps {
  slotLabel: string
  onClose: () => void
  onSelect: (card: SearchResult, language: CardLanguage) => Promise<void>
}

export default function SlotSearchModal({ slotLabel, onClose, onSelect }: SlotSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [language, setLanguage] = useState<CardLanguage>('ES')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al buscar')
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

  async function handleSelect(card: SearchResult) {
    setSaving(card.id)
    setError(null)
    try {
      await onSelect(card, language)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="modal-card modal-card--panel-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header modal-header--bordered">
          <div>
            <h2 className="modal-title">Agregar carta · {slotLabel}</h2>
            <p className="text-xs text-slate-500">Buscá por nombre, número (015/084) o número + set</p>
          </div>
          <button onClick={onClose} className="modal-close">
            Cerrar
          </button>
        </div>

        <div className="px-5 py-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: charizard · 015/084 · 015/084 pitch black"
            autoFocus
            className="field field--search"
          />

          {/* Idioma de la copia: misma impresión para toda la colección */}
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Idioma de tu copia
            </p>
            <LanguagePills value={language} onChange={setLanguage} compact />
          </div>
        </div>

        {error && <p className="px-5 pb-2 text-sm text-red-400">{error}</p>}
        {loading && <p className="px-5 pb-2 text-sm text-slate-400">Buscando…</p>}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-800 px-5 py-3">
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Sin resultados para «{query.trim()}»</p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((card) => (
              <SearchResultCard
                key={card.id}
                card={card}
                busy={saving === card.id}
                disabled={saving !== null}
                actionLabel="Seleccionar"
                busyLabel="Guardando…"
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}