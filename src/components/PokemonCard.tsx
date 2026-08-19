'use client'

import { useCallback, useRef } from 'react'
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
 * Mapea los valores de variant (guardados en binder_cards) a los valores
 * de data-rarity que soporta el CSS de poke-holo:
 * https://github.com/simeydotme/pokemon-cards-css
 *
 * Si variant es 'normal' o no está definido, se usa la rarity del catálogo.
 */
function variantToRarity(variant: string | null | undefined, catalogRarity: string): string {
  switch (variant) {
    case 'holo':              return 'rare holo'
    case 'reverse_holo':      return 'reverse holo'
    case 'v':                 return 'rare holo v'
    case 'v_full_art':        return 'rare ultra'
    case 'v_alternate_art':   return 'rare ultra'
    case 'vmax':              return 'rare holo vmax'
    case 'vmax_alternate':    return 'rare rainbow'
    case 'vstar':             return 'rare holo vstar'
    case 'trainer_full_art':  return 'trainer gallery rare holo'
    case 'rainbow_rare':      return 'rare rainbow'
    case 'secret_rare_gold':  return 'rare secret'
    default:                  return catalogRarity // 'normal' o sin variante → usar rareza del catálogo
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function round(v: number) {
  return Math.round(v * 100) / 100
}

/**
 * Carta estilo real con efectos holo + tilt 3D que sigue al mouse.
 *
 * Basada en https://github.com/simeydotme/pokemon-cards-css (MIT).
 * El efecto se elige por el `variant` del usuario (guardado en DB);
 * si no hay variant, cae a la rarity del catálogo.
 *
 * El mouse tracking actualiza CSS variables que el vendor CSS lee
 * para aplicar glare, rotate, shine position, etc.
 */
export default function PokemonCard({ card }: { card: SlotCard }) {
  const cardRef = useRef<HTMLDivElement>(null)

  const types = (card.types ?? []).join(' ').toLowerCase()
  const subtypes = (card.subtypes ?? []).join(' ').toLowerCase()
  const supertype = (card.supertype ?? '').toLowerCase()
  const catalogRarity = (card.rarity ?? '').toLowerCase()
  const rarity = variantToRarity(card.variant, catalogRarity)
  const isTrainerGallery =
    /^[tg]g/i.test(card.number) || card.id === 'swshp-SWSH076' || card.id === 'swshp-SWSH077'

  const seed = seedFromId(card.id)
  const cosmos = {
    x: Math.floor(seed.x * 734),
    y: Math.floor(seed.y * 1280)
  }

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const el = cardRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clamp(round((100 / rect.width) * (e.clientX - rect.left)), 0, 100)
    const y = clamp(round((100 / rect.height) * (e.clientY - rect.top)), 0, 100)
    const centerX = x - 50
    const centerY = y - 50

    el.style.setProperty('--pointer-x', `${x}%`)
    el.style.setProperty('--pointer-y', `${y}%`)
    el.style.setProperty('--pointer-from-center',
      String(clamp(Math.sqrt(centerY * centerY + centerX * centerX) / 50, 0, 1))
    )
    el.style.setProperty('--pointer-from-top', String(y / 100))
    el.style.setProperty('--pointer-from-left', String(x / 100))
    el.style.setProperty('--rotate-x', `${round(-(centerX / 3.5))}deg`)
    el.style.setProperty('--rotate-y', `${round(centerY / 3.5)}deg`)
    el.style.setProperty('--background-x', `${clamp(adjust(x, 0, 100, 37, 63), 0, 100)}%`)
    el.style.setProperty('--background-y', `${clamp(adjust(y, 0, 100, 33, 67), 0, 100)}%`)
    el.style.setProperty('--card-opacity', '1')
  }, [])

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--pointer-x', '50%')
    el.style.setProperty('--pointer-y', '50%')
    el.style.setProperty('--rotate-x', '0deg')
    el.style.setProperty('--rotate-y', '0deg')
    el.style.setProperty('--background-x', '50%')
    el.style.setProperty('--background-y', '50%')
    el.style.setProperty('--card-opacity', '0')
  }, [])

  return (
    <div
      ref={cardRef}
      className={`card ${types}`}
      data-number={card.number.toLowerCase()}
      data-set={card.set_id.toLowerCase()}
      data-subtypes={subtypes}
      data-supertype={supertype}
      data-rarity={rarity}
      data-trainer-gallery={isTrainerGallery}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--seedx': seed.x,
          '--seedy': seed.y,
          '--cosmosbg': `${cosmos.x}px ${cosmos.y}px`,
          '--pointer-x': '50%',
          '--pointer-y': '50%',
          '--card-opacity': '0',
          '--rotate-x': '0deg',
          '--rotate-y': '0deg',
          '--background-x': '50%',
          '--background-y': '50%',
          '--pointer-from-center': '0',
          '--pointer-from-top': '0.5',
          '--pointer-from-left': '0.5',
          '--card-scale': '1',
          '--translate-x': '0px',
          '--translate-y': '0px',
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

/** Interpola un valor de un rango a otro (lineal). */
function adjust(v: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return ((v - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin
}
