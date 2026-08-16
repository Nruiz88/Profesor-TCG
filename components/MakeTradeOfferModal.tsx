'use client'

import { useEffect, useMemo, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import { effectivePrice } from '@/lib/cardStatus'
import type { SellerInfo } from './SellerInfoBadge'

interface MakeTradeOfferModalProps {
  card: SlotCard
  seller: SellerInfo
  onClose: () => void
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

// Modal de propuesta de intercambio: a la izquierda la carta deseada del otro
// binder, a la derecha el selector visual de cartas propias para entregar,
// más efectivo opcional y mensaje.
export default function MakeTradeOfferModal({ card, seller, onClose }: MakeTradeOfferModalProps) {
  const [ownCards, setOwnCards] = useState<SlotCard[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cashInput, setCashInput] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestedPrice = effectivePrice(card.market_price, card.price_override, card.price)

  useEffect(() => {
    let active = true
    fetch('/api/binder?all=1')
      .then(async (res) => {
        if (!res.ok) throw new Error('No autorizado')
        const data = await res.json()
        if (!active) return
        setOwnCards(data.cards || [])
      })
      .catch(() => {
        if (active) setError('Iniciá sesión para ofrecer un cambio.')
      })
    return () => {
      active = false
    }
  }, [])

  // Cartas propias que se pueden ofrecer: para intercambio o solo colección
  // (se excluyen las que están solo en venta y las reservadas)
  const offerable = useMemo(
    () =>
      (ownCards || []).filter(
        (c) =>
          c.status !== 'reserved' && (c.is_for_trade || (!c.is_for_sale && !c.is_for_trade))
      ),
    [ownCards]
  )

  const cash = cashInput.trim() === '' ? 0 : Number(cashInput)
  const totalOffered =
    [...selected].reduce((sum, id) => {
      const c = offerable.find((x) => x.id === id)
      return sum + (effectivePrice(c?.market_price ?? null, c?.price_override, c?.price) ?? 0)
    }, 0) + (Number.isFinite(cash) ? cash : 0)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    setError(null)
    if (selected.size === 0) {
      setError('Elegí al menos una carta para ofrecer a cambio.')
      return
    }
    if (!seller.id) {
      setError('Falta el perfil del vendedor para enviar la oferta.')
      return
    }
    if (cashInput.trim() !== '' && (!Number.isFinite(cash) || cash < 0)) {
      setError('El monto en efectivo no es válido.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: seller.id,
          requestedCardId: card.id,
          offeredCardIds: [...selected],
          cashOffered: cash,
          message: message.trim() === '' ? null : message.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar la oferta')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Proponer intercambio por ${card.card_name}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Proponer intercambio</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        {sent ? (
          <div className="py-10 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 text-lg font-semibold text-white">¡Oferta enviada!</p>
            <p className="mt-1 text-sm text-slate-400">
              Le llegó a @{seller.username ?? 'coleccionista'} su bandeja de ofertas.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-binder-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              Listo
            </button>
          </div>
        ) : (
          <>
            {/* Lado a lado */}
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {/* Carta deseada */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Quiero obtener
                </p>
                <div className="mt-3 flex gap-3">
                  {card.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt={card.card_name}
                      className="w-20 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{card.card_name}</p>
                    <p className="text-xs text-slate-500">
                      {card.set_id.toUpperCase()} {card.number}
                    </p>
                    <p className="mt-2 text-sm font-bold text-yellow-400">{fmt(requestedPrice)}</p>
                  </div>
                </div>
              </div>

              {/* Cartas propias */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Ofrezco a cambio
                </p>
                {ownCards === null ? (
                  <p className="py-8 text-center text-sm text-slate-500">Cargando tus cartas…</p>
                ) : offerable.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No tenés cartas disponibles para ofrecer (marcá alguna como "Para intercambio"
                    o deja otras en colección).
                  </p>
                ) : (
                  <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {offerable.map((c) => {
                      const price = effectivePrice(c.market_price, c.price_override, c.price)
                      const checked = selected.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors ${
                            checked
                              ? 'border-binder-accent/60 bg-binder-accent/10'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(c.id)}
                            className="h-4 w-4 shrink-0 rounded accent-binder-accent"
                          />
                          {c.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image}
                              alt={c.card_name}
                              className="h-10 w-8 shrink-0 rounded object-cover"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                            {c.card_name}
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-slate-400">
                            {price != null ? `$${price.toFixed(2)}` : '—'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Efectivo + mensaje */}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="offer-cash"
                  className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
                >
                  Dinero extra (USD, opcional)
                </label>
                <input
                  id="offer-cash"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="Ej: 5.00"
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="offer-msg"
                  className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
                >
                  Mensaje (opcional)
                </label>
                <textarea
                  id="offer-msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ej: Me interesa tu carta, ¿lo cerramos?"
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Total de la comparativa */}
            {selected.size > 0 && (
              <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-300">
                Valor de la propuesta:{' '}
                <span className="font-bold text-yellow-400">
                  ${totalOffered.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>{' '}
                vs {fmt(requestedPrice)} de la carta deseada
                {selected.size > 1 ? ` (${selected.size} cartas)` : ''}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={saving || selected.size === 0}
                className="rounded-xl bg-binder-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? 'Enviando…' : 'Enviar oferta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
