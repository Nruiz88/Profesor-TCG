'use client'

import { useEffect, useRef, useState } from 'react'

export interface SearchResult {
  id: string
  name: string
  number: string
  rarity: string | null
  set_id: string
  set_name: string
  image: string
}

interface SlotSearchModalProps {
  slotLabel: string
  onClose: () => void
  onSelect: (card: SearchResult) => Promise<void>
}

export default function SlotSearchModal({ slotLabel, onClose, onSelect }: SlotSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      await onSelect(card)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-binder-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Agregar carta · {slotLabel}</h2>
            <p className="text-xs text-slate-400">Buscá por nombre en el catálogo local</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <div className="px-5 py-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribí el nombre de la carta… ej: charizard"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-binder-sheet px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-binder-accent"
          />
        </div>

        {error && <p className="px-5 pb-2 text-sm text-red-400">{error}</p>}
        {loading && <p className="px-5 pb-2 text-sm text-slate-400">Buscando…</p>}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-5 py-3">
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Sin resultados para «{query.trim()}»</p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((card) => (
              <button
                key={card.id}
                onClick={() => handleSelect(card)}
                disabled={saving !== null}
                className="group relative overflow-hidden rounded-lg border border-white/10 bg-binder-sheet text-left transition-colors hover:border-white/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image}
                  alt={card.name}
                  loading="lazy"
                  className="aspect-[63/88] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1 pt-6">
                  <p className="truncate text-[10px] font-semibold text-white">{card.name}</p>
                  <p className="truncate text-[9px] text-slate-300">
                    {card.set_name} · {card.number}
                  </p>
                </div>
                <span className="absolute right-1 top-1 rounded-full bg-binder-accent px-2 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {saving === card.id ? 'Guardando…' : 'Seleccionar'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}