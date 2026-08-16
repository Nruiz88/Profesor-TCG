'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ExploreCard } from '@/app/api/public/explore/route'
import { formatLocation } from '@/lib/profile'

// Preview del marketplace para la home: muestra las últimas cartas de la
// comunidad en venta o intercambio, con link directo a la ficha del binder.
export default function MarketplacePreview() {
  const [cards, setCards] = useState<ExploreCard[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/explore?view=cards&limit=4&sort=recent')
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

  if (error) return null
  if (cards === null) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <div className="aspect-[63/88] rounded-xl bg-slate-800/60" />
            <div className="mt-3 h-3 w-3/4 rounded bg-slate-800/60" />
            <div className="mt-2 h-2.5 w-1/2 rounded bg-slate-800/40" />
          </div>
        ))}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-12 text-center">
        <p className="text-lg font-semibold text-white">El marketplace recién arranca</p>
        <p className="mt-1 text-sm text-slate-500">
          Publicá tus primeras cartas en venta o para intercambio y aparecen acá para toda la
          comunidad.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={`/binder/${encodeURIComponent(card.username)}?card=${card.id}`}
          className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-colors hover:border-binder-accent/50"
        >
          <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.card_name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {card.status === 'for_sale' && card.price != null ? (
              <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30">
                ${card.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            ) : (
              <span className="absolute right-2 top-2 rounded-full bg-sky-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                Trade
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-semibold text-white" title={card.card_name}>
              {card.card_name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {card.set_name}
              {card.rarity ? ` · ${card.rarity}` : ''}
            </p>
            <p className="mt-1 truncate text-xs text-slate-400">
              <span className="font-medium text-slate-300">@{card.username}</span>
              {formatLocation(card.city, card.country) &&
                ` · ${formatLocation(card.city, card.country)}`}
            </p>
          </div>
        </Link>
      ))}
    </div>
  )
}
