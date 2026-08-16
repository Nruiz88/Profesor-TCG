'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import {
  AVAILABILITIES,
  AVAILABILITY_META,
  availabilityFromFlags,
  type Availability
} from '@/lib/cardStatus'
import { isProfileComplete, type Profile } from '@/lib/profile'
import ClaimKitModal from './ClaimKitModal'

// Condiciones físicas habituales del TCG (opcional, para el mensaje del claim)
const CONDITIONS = ['', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Played']

interface EditCardModalProps {
  card: SlotCard
  profile: Profile | null
  onRequireProfile: (availability: Availability) => void
  onSaved: () => void
  onClose: () => void
}

// Modal de edición de una carta del binder: define la modalidad de
// disponibilidad (solo colección, en venta, para intercambio o ambas),
// el precio manual y las notas de "¿Qué busco a cambio?".
export default function EditCardModal({
  card,
  profile,
  onRequireProfile,
  onSaved,
  onClose
}: EditCardModalProps) {
  const [availability, setAvailability] = useState<Availability>(() =>
    availabilityFromFlags(card.is_for_sale, card.is_for_trade)
  )
  const [priceInput, setPriceInput] = useState<string>(
    card.price != null ? String(card.price) : card.price_override != null ? String(card.price_override) : ''
  )
  const [tradeNotes, setTradeNotes] = useState<string>(card.trade_notes ?? '')
  const [condition, setCondition] = useState<string>(card.condition ?? '')
  const [showKit, setShowKit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withSale = availability === 'solo_venta' || availability === 'venta_o_cambio'
  const withTrade = availability === 'solo_cambio' || availability === 'venta_o_cambio'

  function parsePrice(): number | null {
    const v = priceInput.trim()
    if (v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
  }

  async function handleSave() {
    setError(null)

    // Onboarding progresivo: si va a vender, necesita perfil con whatsapp
    if (withSale && !isProfileComplete(profile)) {
      onRequireProfile(availability)
      return
    }

    const price = parsePrice()
    if (withSale && (price === null || Number.isNaN(price))) {
      setError('Fijá un precio para poner la carta en venta.')
      return
    }
    if (!Number.isNaN(price) && (price === null || (price as number) < 0)) {
      setError('El precio no puede ser negativo.')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = { availability }
      if (withSale) {
        body.price = price
      } else {
        body.price = null
      }
      body.trade_notes = tradeNotes.trim() === '' ? null : tradeNotes.trim()
      body.condition = condition.trim() === '' ? null : condition.trim()

      const res = await fetch(`/api/binder/slots/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSaved()
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${card.card_name}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Editar carta</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500">
          {card.card_name} · {card.set_id.toUpperCase()} {card.number}
        </p>

        {/* Selector de modalidad */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Modalidad
          </p>
          <div className="mt-2 grid gap-2">
            {AVAILABILITIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvailability(a)}
                aria-pressed={availability === a}
                className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
                  availability === a
                    ? 'border-binder-accent/60 bg-binder-accent/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    availability === a ? 'text-binder-accent' : 'text-slate-200'
                  }`}
                >
                  {AVAILABILITY_META[a].label}
                </span>
                <span className="block text-xs text-slate-500">
                  {AVAILABILITY_META[a].description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Precio (solo si acepta venta) */}
        {withSale && (
          <div className="mt-5">
            <label
              htmlFor="edit-price"
              className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Precio (USD)
            </label>
            <input
              id="edit-price"
              type="number"
              min="0"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder={
                card.market_price != null
                  ? `Mercado: $${card.market_price.toFixed(2)}`
                  : 'Ej: 15.00'
              }
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-600">
              {card.market_price != null
                ? `Referencia de mercado: $${card.market_price.toFixed(2)}`
                : 'Sin precio de mercado disponible: fijá el tuyo.'}
            </p>
          </div>
        )}

        {/* Notas de intercambio (solo si acepta cambio) */}
        {withTrade && (
          <div className="mt-5">
            <label
              htmlFor="edit-trade-notes"
              className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              ¿Qué busco a cambio?
            </label>
            <textarea
              id="edit-trade-notes"
              value={tradeNotes}
              onChange={(e) => setTradeNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej: Busco Full Arts de 151, cartas de tipo Fuego…"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-600">{tradeNotes.length}/500</p>
          </div>
        )}

        {/* Condición física (opcional, va en el mensaje del claim) */}
        {(withSale || withTrade) && (
          <div className="mt-5">
            <label
              htmlFor="edit-condition"
              className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Condición (opcional)
            </label>
            <select
              id="edit-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-binder-accent focus:outline-none"
            >
              {CONDITIONS.map((c) => (
                <option key={c || 'none'} value={c}>
                  {c === '' ? 'Sin especificar' : c}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">
              Aparece en el mensaje del claim y en el kit (ej: Near Mint).
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Kit de Claim: texto estructurado + imagen 1080x1080 para vender en redes/grupos */}
        {(withSale || withTrade) && (
          <div className="mt-5 rounded-xl border border-binder-accent/20 bg-binder-accent/5 p-3">
            <button
              onClick={() => setShowKit(true)}
              className="w-full rounded-xl bg-binder-accent/90 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-binder-accent"
            >
              📦 Generar Kit de Claim
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-500">
              Copiá el texto estructurado o generá la imagen 1080×1080 para publicar en grupos y
              redes.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-binder-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {showKit && (
        <ClaimKitModal
          card={card}
          username={profile?.username}
          price={withSale && !Number.isNaN(parsePrice()) ? parsePrice() : undefined}
          onClose={() => setShowKit(false)}
        />
      )}
    </div>
  )
}
