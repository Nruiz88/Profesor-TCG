'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { FullCard } from '@/app/api/cards/[cardId]/route'
import { NO_IMAGE_PLACEHOLDER } from '@/lib/cardImage'
import { effectivePrice } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import LanguageBadge from './LanguageBadge'
import PokemonCard from './PokemonCard'
import PriceInputWithGuide from './PriceInputWithGuide'
import ExpansionHeader from './ExpansionHeader'

interface CardDetailModalProps {
  card: SlotCard
  /** Binder propio: habilita idioma + precio manual con guía externa */
  canEdit?: boolean
  /** Refresca el binder tras guardar el precio manual */
  onSaved?: () => void
  onClose: () => void
}

export default function CardDetailModal({
  card,
  canEdit = false,
  onSaved,
  onClose
}: CardDetailModalProps) {
  const [detail, setDetail] = useState<FullCard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/cards/${card.card_id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!active) return
        if (!res.ok) throw new Error(data.error || 'Error al cargar el detalle')
        setDetail(data.card)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar el detalle')
      })
    return () => {
      active = false
    }
  }, [card.card_id])

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const name = detail?.name ?? card.card_name
  const setLabel = detail ? `${detail.set_name} · ${detail.number}` : `${card.set_id} · ${card.number}`
  const image = detail?.image ?? card.image
  const price = effectivePrice(card.market_price, card.price_override, card.price)

  return (
    <div
      className="modal-overlay z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${name}`}
    >
      <div
        className="modal-card modal-card--panel-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header modal-header--bordered gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="modal-title truncate">{name}</h2>
              <LanguageBadge language={card.language} className="shrink-0" />
            </div>
            <p className="truncate text-xs text-slate-500">
              {setLabel}
              {detail?.rarity ? ` · ${detail.rarity}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="modal-close shrink-0">
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Header resiliente de la expansión: logo HD + símbolo + progreso */}
          <ExpansionHeader setId={card.set_id} className="m-5" />
          {error ? (
            <div className="flex flex-col items-center gap-5 p-6 sm:flex-row">
              <div className="w-40 shrink-0">
                <PokemonCard card={card} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">{name}</p>
                <p className="mt-1 text-sm text-red-400">{error}</p>
              </div>
            </div>
          ) : !detail ? (
            <p className="p-10 text-center text-sm text-slate-400">Cargando detalle…</p>
          ) : (
            <div className="flex flex-col items-center gap-4 p-5">
              {/* Imagen */}
              <div className="w-48">
                <PokemonCard card={card} />
              </div>

              {/* Precio */}
              {price != null && (
                <div className="w-full max-w-xs rounded-xl border border-yellow-400/20 bg-slate-950 px-3 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-yellow-400/50">
                    {card.is_user_reported ? 'Precio reportado por el usuario' : 'Precio de mercado'}
                  </p>
                  <p className="text-lg font-bold text-yellow-400">
                    {formatPrice(price, card.currency)}
                    {card.is_user_reported ? ' ★' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Idioma + consulta de precio externa + precio manual (binder propio) */}
          {canEdit && (
            <div className="border-t border-slate-800 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Idioma y precio manual
              </p>
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <PriceInputWithGuide card={card} onSaved={onSaved} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
