'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { CardLanguage } from '@/lib/cardLanguage'
import { normalizeLanguage } from '@/lib/cardLanguage'
import { buildPriceChartingUrl, CURRENCIES, normalizeCurrency, type Currency } from '@/lib/priceGuide'
import LanguagePills from './LanguagePills'

interface PriceInputWithGuideProps {
  card: SlotCard
  /** Espejo del estado hacia el padre (validación / guardado principal) */
  onLanguageChange?: (lang: CardLanguage) => void
  onPriceInputChange?: (value: string) => void
  onCurrencyChange?: (currency: Currency) => void
  /** Se ejecuta tras persistir el precio manual (para refrescar el binder) */
  onSaved?: () => void
  className?: string
}

// Carga manual de precio con guía de referencia externa: para cartas sin
// valor automático en la base o ediciones especiales/importadas. Incluye
// selector de idioma (pills), deep link a PriceCharting, input de precio,
// selector de moneda y guardado en Supabase (PATCH /api/binder/slots/[id]).
export default function PriceInputWithGuide({
  card,
  onLanguageChange,
  onPriceInputChange,
  onCurrencyChange,
  onSaved,
  className = ''
}: PriceInputWithGuideProps) {
  const [language, setLanguage] = useState<CardLanguage>(() =>
    normalizeLanguage(card.language)
  )
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = card.manual_price ?? card.price ?? card.price_override
    return p != null ? String(p) : ''
  })
  const [currency, setCurrency] = useState<Currency>(() =>
    normalizeCurrency(card.currency)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const hasAutoPrice = card.market_price != null && card.market_price > 0

  const guideUrl = buildPriceChartingUrl({
    cardName: card.card_name,
    setId: card.set_id,
    number: card.number,
    language
  })

  function handleLanguage(lang: CardLanguage) {
    setLanguage(lang)
    setSavedMsg(null)
    onLanguageChange?.(lang)
  }

  function handlePriceInput(value: string) {
    setPriceInput(value)
    setSavedMsg(null)
    onPriceInputChange?.(value)
  }

  function handleCurrency(c: Currency) {
    setCurrency(c)
    setSavedMsg(null)
    onCurrencyChange?.(c)
  }

  async function handleSave() {
    setError(null)
    setSavedMsg(null)

    const v = priceInput.trim()
    let manualPrice: number | null = null
    if (v !== '') {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0) {
        setError('Ingresá un precio válido (mayor o igual a 0).')
        return
      }
      manualPrice = Math.round(n * 100) / 100
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/binder/slots/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, manual_price: manualPrice, currency })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setSavedMsg(
        manualPrice != null
          ? `✓ Precio manual guardado (${currency}).`
          : '✓ Precio manual eliminado: vuelve a usarse el valor automático.'
      )
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={className}>
      {/* A. Selector de idioma */}
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        Idioma de tu copia
      </p>
      <div className="mt-2">
        <LanguagePills value={language} onChange={handleLanguage} />
      </div>

      {/* B. Guía de referencia externa (PriceCharting) */}
      <a
        href={guideUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
      >
        🔍 Ver precio de referencia en PriceCharting ↗
      </a>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
        Abre la búsqueda de tu carta exacta (nombre, set y número) para copiar el precio de
        referencia.
      </p>

      {/* C. Precio manual + moneda + guardado */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label
            htmlFor="guide-price"
            className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500"
          >
            Precio manual
          </label>
          <input
            id="guide-price"
            type="number"
            min="0"
            step="0.01"
            value={priceInput}
            onChange={(e) => handlePriceInput(e.target.value)}
            placeholder={hasAutoPrice ? `Mercado: $${card.market_price?.toFixed(2)}` : 'Ej: 12.50'}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="guide-currency"
            className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500"
          >
            Moneda
          </label>
          <select
            id="guide-currency"
            value={currency}
            onChange={(e) => handleCurrency(e.target.value as Currency)}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-binder-accent focus:outline-none"
          >
            {CURRENCIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        {hasAutoPrice
          ? `Referencia automática de mercado: $${card.market_price?.toFixed(2)} USD. Si tu copia es especial o importada, cargá el valor que encontraste.`
          : 'Esta carta no tiene valor automático en la base. Cargá el precio que encontraste en la referencia externa.'}
      </p>

      {savedMsg && (
        <p className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {savedMsg}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : '💾 Guardar precio manual'}
      </button>
    </div>
  )
}
