'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { CardLanguage } from '@/lib/cardLanguage'
import { normalizeLanguage } from '@/lib/cardLanguage'
import {
  buildCardmarketUrl,
  buildEbayUrl,
  buildPriceChartingUrl,
  buildTcgPlayerUrl,
  CURRENCIES,
  normalizeCurrency,
  type Currency
} from '@/lib/priceGuide'
import { effectivePrice } from '@/lib/cardStatus'
import LanguagePills from './LanguagePills'

interface PriceInputWithGuideProps {
  card: SlotCard
  onLanguageChange?: (lang: CardLanguage) => void
  onPriceInputChange?: (value: string) => void
  onCurrencyChange?: (currency: Currency) => void
  onSaved?: () => void
  className?: string
}

export default function PriceInputWithGuide({
  card,
  onLanguageChange,
  onPriceInputChange,
  onCurrencyChange,
  onSaved,
  className = ''
}: PriceInputWithGuideProps) {
  const [language, setLanguage] = useState<CardLanguage>(() => normalizeLanguage(card.language))
  const [priceInput, setPriceInput] = useState<string>(() => {
    const p = effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)
    return p != null ? String(p) : ''
  })
  const [currency, setCurrency] = useState<Currency>(() => normalizeCurrency(card.currency))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const hasAutoPrice = card.market_price != null && card.market_price > 0

  const opts = { cardName: card.card_name, setId: card.set_id, set_name: card.set_name, number: card.number, language }
  const guideUrls = {
    tcg: buildTcgPlayerUrl(opts),
    pc: buildPriceChartingUrl(opts),
    eb: buildEbayUrl(opts),
    cm: buildCardmarketUrl(opts)
  }

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
        setError('Precio inválido.')
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
      if (!res.ok) throw new Error(data.error || 'Error')
      setSavedMsg(manualPrice != null ? '✓ Guardado' : '✓ Precio eliminado')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Idioma */}
      <LanguagePills value={language} onChange={handleLanguage} />

      {/* Links de referencia — con logos */}
      <div className="grid grid-cols-2 gap-1.5">
        <a href={guideUrls.tcg} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-sky-500/40 hover:text-sky-300">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor"><path d="M10 2L3 6v8l7 4 7-4V6l-7-4zm0 2.2L15 7v6l-5 2.8L5 13V7l5-2.8z"/><path d="M10 6.5l-3 1.7v3.6l3 1.7 3-1.7V8.2l-3-1.7z"/></svg>
          TCGPlayer
        </a>
        <a href={guideUrls.pc} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-sky-500/40 hover:text-sky-300">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor"><path d="M2 16h2V8H2v8zm4 0h2V4H6v12zm4 0h2V10h-2v6zm4 0h2V6h-2v10z"/></svg>
          PriceCharting
        </a>
        <a href={guideUrls.eb} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5"><text x="1" y="15" fontSize="14" fontWeight="bold" fill="#e53238">e</text><text x="7" y="15" fontSize="14" fontWeight="bold" fill="#0064d2">b</text><text x="13" y="15" fontSize="14" fontWeight="bold" fill="#f5af02">a</text><text x="18" y="15" fontSize="14" fontWeight="bold" fill="#86b817">y</text></svg>
        </a>
        <a href={guideUrls.cm} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-amber-500/40 hover:text-amber-300">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
          Cardmarket
        </a>
      </div>

      {/* Precio + moneda en una fila */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={priceInput}
            onChange={(e) => handlePriceInput(e.target.value)}
            placeholder={hasAutoPrice ? `Mercado: ${card.market_price?.toFixed(2)}` : '0.00'}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-7 pr-3 text-sm text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <select
          value={currency}
          onChange={(e) => handleCurrency(e.target.value as Currency)}
          className="shrink-0 rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.id} value={c.id}>{c.symbol}</option>
          ))}
        </select>
      </div>

      {/* Estado */}
      {savedMsg && <p className="text-[11px] font-medium text-emerald-400">{savedMsg}</p>}
      {error && <p className="text-[11px] font-medium text-red-400">{error}</p>}

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
