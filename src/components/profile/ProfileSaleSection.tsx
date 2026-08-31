'use client'

import { memo } from 'react'
import Link from 'next/link'
import MarketCard from '@/components/MarketCard'
import type { ExploreCard } from '@/app/api/public/explore/route'

interface ProfileSaleSectionProps {
  cards: ExploreCard[]
  title?: string
}

// Sección "En Venta" del perfil: lista de cartas en venta/cambio. Reutilizada
// en desktop (grid 5 cols) y mobile (grid 2 cols) del perfil público.
function ProfileSaleSection({ cards, title = 'En Venta' }: ProfileSaleSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-[#00ffcc]/40 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <h4 className="text-lg font-bold text-white">{title}</h4>
        <span className="rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#00ffcc]">
          {cards.length} ítem{cards.length !== 1 ? 's' : ''}
        </span>
      </div>
      {cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No tiene cartas en venta o intercambio todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {cards.slice(0, 10).map((card) => (
            <MarketCard key={card.id} card={card} />
          ))}
        </div>
      )}
      {cards.length > 10 && (
        <Link
          href="/"
          className="mt-4 inline-block text-xs font-semibold text-rose-300 underline-offset-4 hover:text-rose-200 hover:underline"
        >
          Ver las {cards.length} en el mercado →
        </Link>
      )}
    </div>
  )
}

export default memo(ProfileSaleSection)