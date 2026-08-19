'use client'

import dynamic from 'next/dynamic'
import type { ExploreCard } from '@/app/api/public/explore/route'
import type { SlotCard } from '@/lib/sheets'

const PokemonCard = dynamic(() => import('@/components/PokemonCard'), { ssr: false })

interface ShowroomCardsProps {
  cards: ExploreCard[]
}

/** Convierte ExploreCard a SlotCard (shape mínimo que PokemonCard necesita) */
function toSlotCard(c: ExploreCard): SlotCard {
  return {
    id: c.id,
    binder_id: c.binder_id,
    card_id: c.card_id,
    card_name: c.card_name,
    set_id: c.set_id,
    number: c.number,
    slot_number: 0,
    market_price: c.price,
    rarity: c.rarity ?? null,
    language: c.language ?? null,
    image: c.image
  }
}

/** Slot gris placeholder cuando no hay carta destacada */
function EmptySlot() {
  return (
    <div className="flex aspect-[63/88] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-700/40 bg-slate-800/20">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-600" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        Destacá una carta
      </span>
    </div>
  )
}

/**
 * "Mis Cartas Destacadas": hasta 4 cartas lado a lado con el mismo efecto
 * holo del binder (PokemonCard). Sin borde, sin fondo — solo las cartas.
 */
export default function ShowroomCards({ cards }: ShowroomCardsProps) {
  const featured = cards.slice(0, 4)
  const slots = Array.from({ length: 4 }, (_, i) => featured[i] ?? null)

  return (
    <div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ffcc]/80">
        — Mis Cartas Destacadas
      </p>

      <div className="grid grid-cols-4 gap-3">
        {slots.map((card, i) => (
          <div key={card?.id ?? `empty-${i}`} className="relative">
            {card ? (
              <div className="rounded-xl">
                <PokemonCard card={toSlotCard(card)} />
              </div>
            ) : (
              <EmptySlot />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
