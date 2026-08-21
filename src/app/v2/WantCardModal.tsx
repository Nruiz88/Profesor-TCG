'use client'

import { useEffect } from 'react'
import PokemonCard from '@/components/PokemonCard'
import { toSlotCard, type SlotCard } from '@/lib/sheets'
import type { WantlistCard } from '@/types/wantlist'
import './WantCardModal.css'

// Convierte una entrada de wantlist al contrato SlotCard para renderizar la
// carta con efecto holo/3D (PokemonCard) igual que en el binder.
function toSlotCardFromEntry(w: WantlistCard): SlotCard {
  return toSlotCard({
    id: w.card_id,
    binder_id: '',
    card_id: w.card_id,
    card_name: w.card_name,
    set_id: w.set_id,
    set_name: w.set_name,
    number: w.number,
    slot_number: 0,
    market_price: null,
    status: null,
    price_override: null,
    is_for_sale: false,
    is_for_trade: false,
    price: null,
    trade_notes: null,
    condition: null,
    language: null,
    manual_price: null,
    currency: w.currency,
    is_user_reported: false,
    reserved_until: null,
    rarity: w.rarity ?? null,
    supertype: w.supertype ?? null,
    subtypes: w.subtypes ?? null,
    types: w.types ?? null,
    image: w.image
  })
}

/** Modal de una carta buscada: la carta sola, sin fondo, con efecto holo. */
export default function WantCardModal({
  entry,
  onClose
}: {
  entry: WantlistCard
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const slotCard = toSlotCardFromEntry(entry)

  return (
    <div className="modal-overlay wantcm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="wantcm-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Glow difuso detrás de la carta */}
        <div className="wantcm-glow" aria-hidden="true" />
        <button onClick={onClose} aria-label="Cerrar" className="wantcm-close">
          ✕
        </button>
        <div className="wantcm-card">
          <PokemonCard card={slotCard} />
        </div>
      </div>
    </div>
  )
}