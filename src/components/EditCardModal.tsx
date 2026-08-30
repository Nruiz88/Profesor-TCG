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
import { normalizeCurrency, formatPrice, type Currency } from '@/lib/priceGuide'
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
import { SparklesIcon, ShareIcon } from './icons'

interface EditCardModalProps {
  card: SlotCard
  profile: Profile | null
  onRequireProfile: (availability: Availability) => void
  onSaved: () => void
  onClose: () => void
}

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
  const [viewTab, setViewTab] = useState<'view' | 'edit'>('view')

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
        } catch {}
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
    if (price !== null && !Number.isNaN(price) && price < 0) {
      setError('El precio no puede ser negativo.')
      return
    }
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

  const finalPrice = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)

  return (
    <div className="modal-overlay z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div
        className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-slate-700/50 bg-[#090d16]/95 shadow-[0_30px_100px_rgba(0,0,0,0.8)] backdrop-blur-3xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalles de ${card.card_name}`}
      >
        {/* Lado Izquierdo: Carta y Efectos visuales */}
        <div className="relative flex shrink-0 flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 md:w-[400px]">
          {/* Luces de fondo (holographic vibe) */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-30">
            <div className="absolute -left-1/4 -top-1/4 h-64 w-64 rounded-full bg-rose-500/40 blur-[100px]" />
            <div className="absolute -bottom-1/4 -right-1/4 h-64 w-64 rounded-full bg-[#00ffcc]/40 blur-[100px]" />
            <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-violet-500/40 blur-[80px]" />
          </div>

          <div className="relative z-10 w-48 sm:w-64 drop-shadow-[0_25px_45px_rgba(0,0,0,0.7)] transition-transform duration-500 hover:scale-105">
            <PokemonCard card={card} />
          </div>

          {/* Nombre y Set bajo la carta en desktop */}
          <div className="mt-8 hidden text-center md:block relative z-10">
            <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
              {card.card_name}
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md">
                {card.set_id}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-400">
                #{card.number}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 backdrop-blur-md md:hidden"
          >
            ✕
          </button>
        </div>

        {/* Lado Derecho: Controles e Info */}
        <div className="flex min-h-0 flex-1 flex-col bg-slate-900/40">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-6 py-4">
            <div className="md:hidden">
              <h2 className="text-xl font-black text-white">{card.card_name}</h2>
              <p className="font-mono text-xs text-slate-400">{card.set_id.toUpperCase()} #{card.number}</p>
            </div>
            
            <div className="hidden md:flex gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md">
              {(
                [
                  ['view', '👁️ Ver Detalle'],
                  ['edit', '✏️ Configurar']
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setViewTab(t)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
                    viewTab === t ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mobile tabs are handled below to save space in header */}

            <button
              onClick={onClose}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="md:hidden px-6 pt-4">
             <div className="flex gap-1 rounded-xl bg-black/40 p-1 backdrop-blur-md">
              {(
                [
                  ['view', '👁️ Ver Detalle'],
                  ['edit', '✏️ Configurar']
                ] as const
              ).map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setViewTab(t)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                    viewTab === t ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            {viewTab === 'view' ? (
              <div className="animate-in fade-in space-y-8">
                {/* Status Dashboard */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Valor de Mercado</span>
                    <span className="mt-1 text-2xl font-black text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">
                      {finalPrice != null ? formatPrice(finalPrice, card.currency) : 'Consultar'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4 shadow-inner">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Estado</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-xl shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                        {AVAIL_ICONS[availability]}
                      </span>
                      <span className="text-sm font-bold text-white">{AVAILABILITY_META[availability].label}</span>
                    </div>
                  </div>
                </div>

                {/* Info Pills */}
                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Especificaciones</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                      🌍 {(card.language ?? 'ES').toUpperCase()}
                    </div>
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                      ✨ {card.variant ?? 'Normal'}
                    </div>
                    <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                      📦 x{quantity} unidades
                    </div>
                    {condition && (
                       <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-300">
                        🔍 {formatCondition(condition) ?? condition}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notas de cambio */}
                {withTrade && card.trade_notes && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Busco a cambio</h3>
                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm font-medium text-indigo-200">
                      {card.trade_notes}
                    </div>
                  </div>
                )}

                {/* Acciones */}
                {(withSale || withTrade) && (
                  <div className="rounded-2xl border border-[#25D366]/20 bg-[#25D366]/5 p-5">
                    <h3 className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Acciones Directas</h3>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={shareViaWhatsApp}
                        disabled={sharing !== null}
                        className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-black text-[#05331a] shadow-[0_0_20px_rgba(37,211,102,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="transition-transform group-hover:scale-110">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.814-6.293-2.172l-.44-.358-2.634.883.883-2.634-.358-.44A9.965 9.965 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                        </svg>
                        {sharing === 'wa' ? 'Generando imagen...' : 'Ofrecer / Comprar por WhatsApp'}
                      </button>
                      <button
                        onClick={copyLinkWithImage}
                        disabled={sharing !== null}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60"
                      >
                        <ShareIcon className="h-4 w-4" />
                        {sharing === 'copy' ? 'Generando...' : 'Copiar enlace e imagen'}
                      </button>
                    </div>
                    {shareError && <p className="mt-3 text-center text-xs font-semibold text-amber-400">{shareError}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Precio</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          placeholder={card.market_price != null && card.market_price > 0 ? `Mercado: ${card.market_price.toFixed(2)}` : '0.00'}
                          className="w-full rounded-xl border border-slate-700 bg-black/50 py-3 pl-8 pr-3 text-sm font-bold text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                        />
                      </div>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as Currency)}
                        className="shrink-0 rounded-xl border border-slate-700 bg-black/50 px-3 py-3 text-sm font-bold text-white focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.id} value={c.id}>{c.symbol} {c.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Unidades</label>
                    <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-black/50 p-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(-1)}
                        disabled={quantity <= 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="text-lg font-black text-white">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Disponibilidad</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {AVAILABILITIES.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvailability(a)}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 transition-all ${
                          availability === a
                            ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                            : 'border-slate-800 bg-black/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xl">{AVAIL_ICONS[a]}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${availability === a ? 'text-rose-400' : 'text-slate-500'}`}>
                          {AVAILABILITY_META[a].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Idioma</label>
                    <LanguagePills value={language} onChange={setLanguage} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Condición</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-black/50 px-3 py-3 text-sm font-semibold text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="">No especificada</option>
                      {conditionOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Variante</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'normal', label: 'Normal', icon: '🃏' }, { id: 'holo', label: 'Holo', icon: '✨' },
                      { id: 'reverse_holo', label: 'R.Holo', icon: '🔄' }, { id: 'v', label: 'V', icon: '⚡' },
                      { id: 'v_full_art', label: 'V FA', icon: '🖼️' }, { id: 'v_alternate_art', label: 'V Alt', icon: '🎨' },
                      { id: 'vmax', label: 'VMAX', icon: '💥' }, { id: 'vmax_alternate', label: 'VMAX Alt', icon: '🌈' },
                      { id: 'vstar', label: 'VSTAR', icon: '⭐' }, { id: 'trainer_full_art', label: 'Trainer FA', icon: '🧑‍🏫' },
                      { id: 'rainbow_rare', label: 'Rainbow', icon: '🌈' }, { id: 'secret_rare_gold', label: 'Gold SR', icon: '🥇' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVariant(v.id)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          variant === v.id
                            ? 'border-rose-500 bg-rose-500/20 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                            : 'border-slate-800 bg-black/50 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span>{v.icon}</span> {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {withTrade && (
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Busco a cambio</label>
                    <textarea
                      value={tradeNotes}
                      onChange={(e) => setTradeNotes(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Ej: Cartas full art, 151, etc..."
                      className="w-full resize-none rounded-xl border border-slate-700 bg-black/50 p-3 text-sm font-medium text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                    />
                  </div>
                )}

                <div className="rounded-xl border border-slate-800 bg-black/30 p-4">
                  <button
                    type="button"
                    onClick={() => setShowRefs(!showRefs)}
                    className="flex w-full items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white"
                  >
                    <span>Precios de Referencia Externos</span>
                    <span className={`transition-transform ${showRefs ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {showRefs && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <a href={guideUrls.priceCharting} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-sky-900/30 px-3 py-2 text-xs font-bold text-sky-400 hover:bg-sky-900/50">
                        🔍 PriceCharting ↗
                      </a>
                      <a href={guideUrls.ebay} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-emerald-900/30 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50">
                        🛒 eBay ↗
                      </a>
                      <a href={guideUrls.cardmarket} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-amber-900/30 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-900/50">
                        🏷️ Cardmarket ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-800/80 bg-slate-900/50 px-6 py-4">
            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-400">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:text-white"
              >
                Cerrar
              </button>
              {viewTab === 'edit' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-black text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all hover:bg-rose-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
