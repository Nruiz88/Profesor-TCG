'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ExploreCard } from '@/app/api/public/explore/route'
import MarketCard, { isRareCard } from '@/components/MarketCard'

type FeedMode = 'all' | 'for_sale' | 'for_trade' | 'rare'

const MODES: { id: FeedMode; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'for_sale', label: '💵 En Venta' },
  { id: 'for_trade', label: '🔄 Para Cambio' },
  { id: 'rare', label: '🔥 Cartas Raras' }
]

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="shimmer aspect-[63/88] rounded-t-2xl" />
      <div className="space-y-2 p-3">
        <div className="shimmer h-3 w-3/4 rounded" />
        <div className="shimmer h-2.5 w-1/2 rounded" />
      </div>
    </div>
  )
}

/**
 * Galería 3D del marketplace en la home: las últimas cartas publicadas por la
 * comunidad con filtros rápidos client-side, sin recargar la página.
 */
export default function LiveMarketFeed() {
  const [cards, setCards] = useState<ExploreCard[] | null>(null)
  const [error, setError] = useState(false)
  const [mode, setMode] = useState<FeedMode>('all')

  useEffect(() => {
    let active = true
    fetch('/api/public/explore?view=cards&limit=12&sort=recent')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (active) setCards(data.cards || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!cards) return []
    if (mode === 'for_sale') return cards.filter((c) => c.status === 'for_sale')
    if (mode === 'for_trade') return cards.filter((c) => c.status === 'for_trade')
    if (mode === 'rare') return cards.filter(isRareCard)
    return cards
  }, [cards, mode])

  const counts = useMemo(() => {
    const base = cards ?? []
    return {
      all: base.length,
      for_sale: base.filter((c) => c.status === 'for_sale').length,
      for_trade: base.filter((c) => c.status === 'for_trade').length,
      rare: base.filter(isRareCard).length
    }
  }, [cards])

  if (error) return null

  return (
    <div>
      {/* Chips de filtro rápido */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => {
          const active = mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? 'border-binder-accent bg-binder-accent/15 text-binder-accent'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {m.label}
              {cards && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-binder-accent text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {counts[m.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {cards === null ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-14 text-center">
          <p className="text-lg font-semibold text-white">
            {mode === 'all'
              ? 'El marketplace recién arranca'
              : 'Sin cartas con ese filtro'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'all'
              ? 'Publicá tus primeras cartas en venta o para intercambio y aparecen acá para toda la comunidad.'
              : 'Probá con otro filtro, o publicá tus cartas para que la comunidad las vea.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((card) => (
            <MarketCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  )
}
