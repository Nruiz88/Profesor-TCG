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
import {
  CARD_CONDITIONS,
  formatCondition,
  isCardCondition
} from '@/lib/cardCondition'
import {
  buildCardmarketUrl,
  buildEbayUrl,
  buildPriceChartingUrl,
  CURRENCIES
} from '@/lib/priceGuide'
import LanguagePills from './LanguagePills'
import ClaimKitModal from './ClaimKitModal'

interface EditCardModalProps {
  card: SlotCard
  profile: Profile | null
  onRequireProfile: (availability: Availability) => void
  onSaved: () => void
  onClose: () => void
}

// Iconos compactos para cada modalidad
const AVAIL_ICONS: Record<Availability, string> = {
  solo_coleccion: '🔒',
  solo_venta: '💰',
  solo_cambio: '🔄',
  venta_o_cambio: '💎'
}

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
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = card.manual_price ?? card.price ?? card.price_override
    return p != null ? String(p) : ''
  })
  const [currency, setCurrency] = useState<Currency>(() => normalizeCurrency(card.currency))
  const [tradeNotes, setTradeNotes] = useState<string>(card.trade_notes ?? '')
  const [condition, setCondition] = useState<string>(card.condition ?? '')
  const [language, setLanguage] = useState<CardLanguage>(() => normalizeLanguage(card.language))
  const [variant, setVariant] = useState<string>(card.variant ?? 'normal')
  const [showKit, setShowKit] = useState(false)
  const [showRefs, setShowRefs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const withSale = availability === 'solo_venta' || availability === 'venta_o_cambio'
  const withTrade = availability === 'solo_cambio' || availability === 'venta_o_cambio'

  const conditionOptions: { id: string; label: string }[] = CARD_CONDITIONS.map((c) => ({
    id: c.id,
    label: formatCondition(c.id) ?? c.id
  }))
  if (condition !== '' && !isCardCondition(condition)) {
    conditionOptions.unshift({ id: condition, label: condition })
  }

  const guideUrls = {
    priceCharting: buildPriceChartingUrl({
      cardName: card.card_name,
      setId: card.set_id,
      set_name: card.set_name,
      number: card.number,
      language
    }),
    ebay: buildEbayUrl({
      cardName: card.card_name,
      setId: card.set_id,
      set_name: card.set_name,
      number: card.number,
      language
    }),
    cardmarket: buildCardmarketUrl({
      cardName: card.card_name,
      setId: card.set_id,
      set_name: card.set_name,
      number: card.number,
      language
    })
  }

  function parsePrice(): number | null {
    const v = priceInput.trim()
    if (v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN
  }

  async function handleSave() {
    setError(null)

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
      const body: Record<string, unknown> = { availability, language, currency }
      body.price = withSale ? price : null
      body.manual_price = price
      body.trade_notes = tradeNotes.trim() === '' ? null : tradeNotes.trim()
      body.condition = condition.trim() === '' ? null : condition.trim()
      body.variant = variant

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
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="modal-card modal-card--md modal-card--scroll max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Editar ${card.card_name}`}
      >
        {/* Header compacto */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">{card.card_name}</h2>
            <p className="truncate text-xs text-slate-500">
              {card.set_id.toUpperCase()} · #{card.number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Idioma — pills compactos */}
        <div className="mt-4">
          <LanguagePills value={language} onChange={setLanguage} />
        </div>

        {/* Variante de la carta */}
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Variante
          </p>
          <div className="flex flex-wrap gap-1.5">              {[
              { id: 'normal', label: 'Normal', icon: '🃏' },
              { id: 'holo', label: 'Holo', icon: '✨' },
              { id: 'reverse_holo', label: 'R.Holo', icon: '🔄' },
              { id: 'v', label: 'Pokémon V', icon: '⚡' },
              { id: 'v_full_art', label: 'V Full Art', icon: '🖼️' },
              { id: 'v_alternate_art', label: 'V Alt Art', icon: '🎨' },
              { id: 'vmax', label: 'VMAX', icon: '💥' },
              { id: 'vmax_alternate', label: 'VMAX Alt', icon: '🌈' },
              { id: 'vstar', label: 'VSTAR', icon: '⭐' },
              { id: 'trainer_full_art', label: 'Trainer FA', icon: '🧑‍🏫' },
              { id: 'rainbow_rare', label: 'Rainbow', icon: '🌈' },
              { id: 'secret_rare_gold', label: 'Gold SR', icon: '🥇' }
            ].map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  variant === v.id
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Precio + moneda — fila compacta */}
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Precio
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={
                  card.market_price != null && card.market_price > 0
                    ? `Mercado: ${card.market_price.toFixed(2)}`
                    : '0.00'
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-7 pr-3 text-sm text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="shrink-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} {c.id}
              </option>
            ))}
          </select>
        </div>

        {/* Referencias externas — colapsable */}
        <button
          type="button"
          onClick={() => setShowRefs(!showRefs)}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
        >
          <span className={`transition-transform ${showRefs ? 'rotate-90' : ''}`}>▸</span>
          Ver precios de referencia
        </button>
        {showRefs && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <a
              href={guideUrls.priceCharting}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:border-sky-500/40 hover:text-sky-300"
            >
              🔍 PriceCharting ↗
            </a>
            <a
              href={guideUrls.ebay}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300"
            >
              🛒 eBay ↗
            </a>
            <a
              href={guideUrls.cardmarket}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-[11px] font-medium text-slate-300 transition-colors hover:border-amber-500/40 hover:text-amber-300"
            >
              🏷️ Cardmarket ↗
            </a>
          </div>
        )}

        {/* Modalidad — grid compacto 2x2 */}
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Disponibilidad
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {AVAILABILITIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvailability(a)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  availability === a
                    ? 'border-rose-500/50 bg-rose-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                }`}
              >
                <span className="text-base">{AVAIL_ICONS[a]}</span>
                <span
                  className={`text-xs font-semibold ${
                    availability === a ? 'text-rose-300' : 'text-slate-300'
                  }`}
                >
                  {AVAILABILITY_META[a].label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notas de intercambio */}
        {withTrade && (
          <div className="mt-4">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Busco a cambio
            </label>
            <textarea
              value={tradeNotes}
              onChange={(e) => setTradeNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej: Full Arts de 151, cartas fuego…"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
            />
          </div>
        )}

        {/* Condición */}
        {(withSale || withTrade) && (
          <div className="mt-4">
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Condición
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
            >
              <option value="">No especificada</option>
              {conditionOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kit de Claim — link sutil */}
        {(withSale || withTrade) && (
          <button
            onClick={() => setShowKit(true)}
            className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:border-rose-500/30 hover:text-rose-300"
          >
            📦 Generar Kit de Claim
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500 disabled:opacity-50"
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
