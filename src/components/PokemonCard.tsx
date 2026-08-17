'use client'

import type { SlotCard } from '@/lib/sheets'
import { NO_IMAGE_PLACEHOLDER } from '@/lib/cardImage'

// Seed determinista por id: el efecto cosmos necesita una posición estable
// entre el render del servidor (SSR) y la hidratación en el cliente.
function seedFromId(id: string): { x: number; y: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 100003
  }
  return {
    x: (h % 997) / 997,
    y: ((h >> 3) % 997) / 997
  }
}

/**
 * Carta estilo real con efectos holo, basada en
 * https://github.com/simeydotme/pokemon-cards-css (MIT).
 * El efecto se elige por atributos data-* (rarity, subtypes, supertype, ...);
 * sin la clase `interactive` el propio CSS aplica hover (tilt + glare).
 */
export default function PokemonCard({ card }: { card: SlotCard }) {
  const types = (card.types ?? []).join(' ').toLowerCase()
  const subtypes = (card.subtypes ?? []).join(' ').toLowerCase()
  const rarity = (card.rarity ?? '').toLowerCase()
  const supertype = (card.supertype ?? '').toLowerCase()
  const isTrainerGallery =
    /^[tg]g/i.test(card.number) || card.id === 'swshp-SWSH076' || card.id === 'swshp-SWSH077'

  const seed = seedFromId(card.id)
  const cosmos = {
    x: Math.floor(seed.x * 734),
    y: Math.floor(seed.y * 1280)
  }

  return (
    <div
      className={`card ${types}`}
      data-number={card.number.toLowerCase()}
      data-set={card.set_id.toLowerCase()}
      data-subtypes={subtypes}
      data-supertype={supertype}
      data-rarity={rarity}
      data-trainer-gallery={isTrainerGallery}
      style={
        {
          '--seedx': seed.x,
          '--seedy': seed.y,
          '--cosmosbg': `${cosmos.x}px ${cosmos.y}px`
        } as React.CSSProperties
      }
    >
      <div className="card__translater">
        <div className="card__rotator">
          <div className="card__front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.card_name}
              loading="lazy"
              width={660}
              height={921}
              onError={(e) => {
                // pokemontcg.io responde 404 con el reverso como body; mostramos un placeholder
                e.currentTarget.onerror = null
                e.currentTarget.src = NO_IMAGE_PLACEHOLDER
              }}
            />
            <div className="card__shine" />
            <div className="card__glare" />
          </div>
        </div>
      </div>
    </div>
  )
}
