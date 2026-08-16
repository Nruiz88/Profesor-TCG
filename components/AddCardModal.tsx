'use client'

import { useEffect, useMemo, useState } from 'react'

interface SetItem {
  id: string
  name: string
  series: string
  printedTotal: number
  releaseDate?: string
}

interface CardItem {
  id: string
  name: string
  number: string
  rarity: string | null
  supertype: string | null
  image: string
}

interface AddCardModalProps {
  onClose: () => void
  onAdd: (card: CardItem) => void
}

export default function AddCardModal({ onClose, onAdd }: AddCardModalProps) {
  const [sets, setSets] = useState<SetItem[]>([])
  const [selectedSet, setSelectedSet] = useState('')
  const [cards, setCards] = useState<CardItem[]>([])
  const [query, setQuery] = useState('')
  const [loadingSets, setLoadingSets] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sets')
      .then((r) => r.json())
      .then((d) => {
        if (d.sets) setSets(d.sets)
        else setError(d.error || 'No se pudieron cargar los sets')
      })
      .catch(() => setError('Error de red al cargar sets'))
      .finally(() => setLoadingSets(false))
  }, [])

  useEffect(() => {
    if (!selectedSet) {
      setCards([])
      return
    }
    setLoadingCards(true)
    setError(null)
    fetch(`/api/sets/${selectedSet}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.cards) setCards(d.cards)
        else setError(d.error || 'No se pudieron cargar las cartas')
      })
      .catch(() => setError('Error de red al cargar cartas'))
      .finally(() => setLoadingCards(false))
  }, [selectedSet])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => c.name.toLowerCase().includes(q))
  }, [cards, query])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-binder-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold">Agregar carta</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <select
            value={selectedSet}
            onChange={(e) => setSelectedSet(e.target.value)}
            disabled={loadingSets}
            className="rounded-lg border border-white/10 bg-binder-sheet px-3 py-2 text-sm text-slate-200 disabled:opacity-50"
          >
            <option value="">{loadingSets ? 'Cargando sets…' : 'Elegí un set'}</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.series})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            disabled={!selectedSet || loadingCards}
            className="rounded-lg border border-white/10 bg-binder-sheet px-3 py-2 text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50"
          />
        </div>

        {error && <p className="px-5 pb-3 text-sm text-red-400">{error}</p>}
        {loadingCards && <p className="px-5 pb-3 text-sm text-slate-400">Cargando cartas…</p>}

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-5 py-3">
          {!loadingCards && selectedSet && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Sin resultados</p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  onAdd(card)
                  onClose()
                }}
                className="group relative overflow-hidden rounded-lg border border-white/10 bg-binder-sheet text-left transition-colors hover:border-white/30"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image}
                  alt={card.name}
                  loading="lazy"
                  className="aspect-[63/88] w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1">
                  <p className="truncate text-[10px] font-semibold text-white">{card.name}</p>
                  <p className="truncate text-[9px] text-slate-300">{card.number}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}