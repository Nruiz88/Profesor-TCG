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
import { normalizeLanguage, type CardLanguage } from '@/lib/cardLanguage'
import { normalizeCurrency, type Currency } from '@/lib/priceGuide'
import PriceInputWithGuide from './PriceInputWithGuide'
import ClaimKitModal from './ClaimKitModal'

// Condiciones físicas habituales del TCG (opcional, para el mensaje del claim)
const CONDITIONS = ['', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Played']

interface EditCardModalProps {
  card: SlotCard
  profile: Profile | null
  onRequireProfile: (availability: Availability) => void
  onSaved: () => void
  /** Refresca el binder sin cerrar el modal (tras guardar el precio manual) */
  onRefresh?: () => void
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
  onRefresh,
  onClose
}: EditCardModalProps) {
  const [availability, setAvailability] = useState<Availability>(() =>
    availabilityFromFlags(card.is_for_sale, card.is_for_trade)
  )
  const [priceInput, setPriceInput] = useState<string>(
    card.manual_price != null
      ? String(card.manual_price)
      : card.price != null
        ? String(card.price)
        : card.price_override != null
          ? String(card.price_override)
          : ''
  )
  const [currency, setCurrency] = useState<Currency>(() => normalizeCurrency(card.currency))
  const [tradeNotes, setTradeNotes] = useState<string>(card.trade_notes ?? '')
  const [condition, setCondition] = useState<string>(card.condition ?? '')
  const [language, setLanguage] = useState<CardLanguage>(() => normalizeLanguage(card.language))
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
      body.language = language
      body.currency = currency

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
      className="modal-overlay z-50"
      onClick={onClose}
    >
      <div
        className="modal-card modal-card--md modal-card--scroll max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${card.card_name}`}
      >
        <div className="modal-header">
          <h2 className="modal-title">Editar carta</h2>
          <button onClick={onClose} className="modal-close">
            Cerrar
          </button>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500">
          {card.card_name} · {card.set_id.toUpperCase()} {card.number}
        </p>

        {/* Idioma + precio manual con guía de referencia externa */}
        <div className="mt-5">
          <PriceInputWithGuide
            card={card}
            onLanguageChange={setLanguage}
            onPriceInputChange={setPriceInput}
            onCurrencyChange={setCurrency}
            onSaved={onRefresh}
          />
        </div>

        {/* Selector de modalidad */}
        <div className="mt-5">
          <p className="field-label">Modalidad</p>
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

        {/* Recordatorio: el precio manual se guarda en la sección superior */}
        {withSale && priceInput.trim() === '' && (
          <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            Para poner la carta en venta fijá el precio en «Precio manual» (sección superior).
          </p>
        )}

        {/* Notas de intercambio (solo si acepta cambio) */}
        {withTrade && (
          <div className="mt-5">
            <label
              htmlFor="edit-trade-notes"
              className="field-label"
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
              className="field mt-1.5 resize-none"
            />
            <p className="field-hint text-right">{tradeNotes.length}/500</p>
          </div>
        )}

        {/* Condición física (opcional, va en el mensaje del claim) */}
        {(withSale || withTrade) && (
          <div className="mt-5">
            <label
              htmlFor="edit-condition"
              className="field-label"
            >
              Condición (opcional)
            </label>
            <select
              id="edit-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="field mt-1.5"
            >
              {CONDITIONS.map((c) => (
                <option key={c || 'none'} value={c}>
                  {c === '' ? 'Sin especificar' : c}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Aparece en el mensaje del claim y en el kit (ej: Near Mint).
            </p>
          </div>
        )}

        {error && (
          <p className="banner banner--error mt-4">{error}</p>
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
            className="btn-claim btn-claim--compact btn-claim--ghost"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-claim btn-claim--compact btn-claim--accent"
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
