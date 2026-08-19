'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { FullCard } from '@/app/api/cards/[cardId]/route'
import { effectivePrice } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import { cardPublicUrl } from '@/lib/claim'
import LanguageBadge from './LanguageBadge'
import VariantBadge from './VariantBadge'
import PokemonCard from './PokemonCard'
import PriceInputWithGuide from './PriceInputWithGuide'

interface CardDetailModalProps {
  card: SlotCard
  canEdit?: boolean
  onSaved?: () => void
  onClose: () => void
}

export default function CardDetailModal({ card, canEdit = false, onSaved, onClose }: CardDetailModalProps) {
  const [detail, setDetail] = useState<FullCard | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/cards/${card.card_id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!active) return
        if (res.ok) setDetail(data.card)
      })
      .catch(() => {})
    return () => { active = false }
  }, [card.card_id])

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

  const name = detail?.name ?? card.card_name
  const setLabel = detail ? `${detail.set_name} · ${detail.number}` : `${card.set_id} · ${card.number}`
  const price = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)

  return (
    <div className="modal-overlay z-50" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card modal-card--panel flex max-h-[90vh] w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header minimal */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{name}</h2>
            <p className="truncate text-[11px] text-slate-500">{setLabel}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <VariantBadge variant={card.variant} />
            <LanguageBadge language={card.language} />
            <button onClick={onClose} className="ml-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:text-white">✕</button>
          </div>
        </div>

        {/* Cuerpo scrolleable: carta a la izquierda, info a la derecha */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-start">
            {/* Carta a la izquierda */}
            <div className="mx-auto shrink-0 sm:mx-0 sm:w-48">
              <div className="w-40 sm:w-full">
                <PokemonCard card={card} />
              </div>

              {/* Compartir carta sola en venta: debajo de la carta */}
              {(card.is_for_sale || card.is_for_trade) && (
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const url = cardPublicUrl(card.id, card.card_name)
                      const text = `✨ ${card.card_name} · ${card.set_id.toUpperCase()} #${card.number}\n${url}`
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.814-6.293-2.172l-.44-.358-2.634.883.883-2.634-.358-.44A9.965 9.965 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                    </svg>
                    Compartir en WhatsApp
                  </button>
                  <button
                    onClick={async () => {
                      const url = cardPublicUrl(card.id, card.card_name)
                      try {
                        await navigator.clipboard.writeText(url)
                      } catch {
                        window.prompt('Copiá el link de la carta:', url)
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Copiar link
                  </button>
                </div>
              )}
            </div>

            {/* Info + controles a la derecha */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Precio */}
              {price != null && (
                <p className="text-lg font-bold text-yellow-400">
                  {formatPrice(price, card.currency)}
                  {card.is_user_reported ? <span className="ml-1 text-xs text-yellow-400/60">★</span> : null}
                </p>
              )}

              {canEdit ? (
                <div className="mt-3 space-y-4">
                  {/* Cantidad de copias */}
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Copias
                    </p>
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 p-1.5">
                      <button
                        onClick={async () => {
                          const qty = card.quantity ?? 1
                          if (qty <= 1) {
                            if (!window.confirm(`¿Quitar "${card.card_name}" de tu binder?`)) return
                            await fetch(`/api/binder/slots/${card.id}`, { method: 'DELETE' })
                          } else {
                            await fetch(`/api/binder/slots/${card.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ quantity: qty - 1 })
                            })
                          }
                          onSaved?.()
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-lg font-bold text-slate-300 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                        aria-label="Quitar una copia"
                      >
                        −
                      </button>
                      <span className="min-w-11 text-center text-xl font-bold text-white">
                        {card.quantity ?? 1}
                      </span>
                      <button
                        onClick={async () => {
                          const qty = card.quantity ?? 1
                          await fetch(`/api/binder/slots/${card.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ quantity: qty + 1 })
                          })
                          onSaved?.()
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-lg font-bold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                        aria-label="Agregar una copia"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Precio editable */}
                  <div className="border-t border-slate-800 pt-4">
                    <PriceInputWithGuide card={card} onSaved={onSaved} />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Esta carta está en la colección de alguien más. Contactalo para coordinar un intercambio.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
