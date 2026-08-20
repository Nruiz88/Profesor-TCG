'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import {
  AVAILABILITIES,
  AVAILABILITY_META,
  availabilityFromFlags,
  effectivePrice,
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
import PokemonCard from './PokemonCard'
import {
  generateCardShareImage,
  cardShareText
} from '@/lib/cardShareImage'

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
  const [quantity, setQuantity] = useState<number>(card.quantity ?? 1)
  const [availability, setAvailability] = useState<Availability>(() =>
    availabilityFromFlags(card.is_for_sale, card.is_for_trade)
  )
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)
    return p != null ? String(p) : ''
  })
  const [currency, setCurrency] = useState<Currency>(() => normalizeCurrency(card.currency))
  const [tradeNotes, setTradeNotes] = useState<string>(card.trade_notes ?? '')
  const [condition, setCondition] = useState<string>(card.condition ?? '')
  const [language, setLanguage] = useState<CardLanguage>(() => normalizeLanguage(card.language))
  const [variant, setVariant] = useState<string>(card.variant ?? 'normal')
  const [showRefs, setShowRefs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sharing, setSharing] = useState<'wa' | 'copy' | null>(null)
  const [shareError, setShareError] = useState<string | null>(null)

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

  function updateQuantity(delta: number) {
    setQuantity((prev) => Math.max(1, prev + delta))
  }

  // Genera la imagen de la carta (800x800) y la comparte con el link.
  async function shareViaWhatsApp() {
    if (sharing) return
    setSharing('wa')
    setShareError(null)
    try {
      const text = cardShareText(card, parsePrice())
      const imageUrl = await generateCardShareImage({
        card,
        price: parsePrice(),
        availability,
        username: profile?.username ?? null
      })
      if (imageUrl && navigator.share && navigator.canShare?.({ files: [new File(['x'], 'x.png', { type: 'image/png' })] })) {
        const res = await fetch(imageUrl)
        const blob = await res.blob()
        const safe = `${card.card_name}-${card.set_id}-${card.number}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        const file = new File([blob], `${safe}.png`, { type: 'image/png' })
        try {
          await navigator.share({ title: `${card.card_name} — ${card.set_id.toUpperCase()} #${card.number}`, text, files: [file] })
          return
        } catch {
          // cancelado o sin soporte
        }
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      setShareError('No se pudo generar la imagen. Compartí el link directo.')
      const text = cardShareText(card, parsePrice())
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } finally {
      setSharing(null)
    }
  }

  async function copyLinkWithImage() {
    if (sharing) return
    setSharing('copy')
    setShareError(null)
    try {
      await generateCardShareImage({
        card,
        price: parsePrice(),
        availability,
        username: profile?.username ?? null
      })
      const text = cardShareText(card, parsePrice())
      await navigator.clipboard.writeText(text)
    } catch {
      setShareError('No se pudo generar la imagen.')
    } finally {
      setSharing(null)
    }
  }

  async function handleSave() {
    setError(null)

    if (withSale && !isProfileComplete(profile)) {
      onRequireProfile(availability)
      return
    }

    const price = parsePrice()
    // Si el usuario puso un precio numérico, validarlo (null = vacío está OK)
    if (price !== null && !Number.isNaN(price) && price < 0) {
      setError('El precio no puede ser negativo.')
      return
    }
    // Si está en venta y no puso precio manual, verificar que ya exista precio de mercado
    if (withSale && price === null && (!card.market_price || card.market_price <= 0)) {
      setError('Fijá un precio para poner la carta en venta.')
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
      body.quantity = quantity

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
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-300">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4a8 8 0 010 16 8 8 0 010-16zm-5 8a5 5 0 1110 0 5 5 0 01-10 0z" />
            </svg>
            Carta destacada
          </span>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Layout dos columnas: carta gigante | controles */}
        <div className="mt-4 flex flex-col gap-5 lg:flex-row">
          {/* Columna izquierda: carta gigante */}
          <div className="flex shrink-0 flex-col items-center gap-3 lg:w-64">
            <div className="w-52 drop-shadow-[0_18px_35px_rgba(0,0,0,0.6)] sm:w-60 lg:w-full">
              <PokemonCard card={card} />
            </div>
            <h2 className="text-center text-lg font-black tracking-tight text-white">
              {card.card_name}
            </h2>
            <p className="text-center text-xs text-slate-500">
              {card.set_id.toUpperCase()} · #{card.number}
            </p>

            {/* Disponibilidad — solo iconos */}
            <div className="mt-1 flex items-center gap-2">
              {AVAILABILITIES.map((a) => {
                const active = availability === a
                return (
                  <button
                    key={a}
                    type="button"
                    title={AVAILABILITY_META[a].label}
                    onClick={() => setAvailability(a)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg transition-all ${
                      active
                        ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
                        : 'border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {AVAIL_ICONS[a]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Columna derecha: controles */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Precio */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Precio
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
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
            </div>

            {/* Idioma */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Idioma
              </p>
              <LanguagePills value={language} onChange={setLanguage} />
            </div>

            {/* Unidades */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Unidades
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(-1)}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-lg font-bold text-slate-300 transition-colors hover:border-rose-500/50 hover:text-rose-400 disabled:opacity-40"
                  aria-label="Quitar una unidad"
                >
                  −
                </button>
                <span className="min-w-11 text-center text-xl font-bold text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-lg font-bold text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                  aria-label="Agregar una unidad"
                >
                  +
                </button>
              </div>
            </div>

            {/* Variante */}
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Variante
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
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

            {/* Referencias externas — colapsable */}
            <button
              type="button"
              onClick={() => setShowRefs(!showRefs)}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
            >
              <span className={`transition-transform ${showRefs ? 'rotate-90' : ''}`}>▸</span>
              Ver precios de referencia
            </button>
            {showRefs && (
              <div className="grid grid-cols-3 gap-1.5">
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

            {/* Notas de intercambio */}
            {withTrade && (
              <div>
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
              <div>
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
          </div>
        </div>

        {/* Acciones P2P: WhatsApp + copiar */}
        {(withSale || withTrade) && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={shareViaWhatsApp}
              disabled={sharing !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-3 py-3.5 text-sm font-black text-[#05331a] shadow-lg shadow-emerald-950/50 transition-all hover:brightness-110 disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.814-6.293-2.172l-.44-.358-2.634.883.883-2.634-.358-.44A9.965 9.965 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
              </svg>
              {sharing === 'wa' ? 'Generando…' : 'Comprar vía WhatsApp'}
            </button>
            <button
              onClick={copyLinkWithImage}
              disabled={sharing !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3.5 text-sm font-bold text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {sharing === 'copy' ? 'Generando…' : 'Copiar Link'}
            </button>
            {shareError && (
              <p className="col-span-2 mt-1 text-center text-[11px] text-amber-400">{shareError}</p>
            )}
          </div>
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
            className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
