'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { CardLanguage } from '@/lib/cardLanguage'
import { normalizeLanguage } from '@/lib/cardLanguage'
import {
  buildCardmarketUrl,
  buildEbayUrl,
  buildPriceChartingUrl,
  CURRENCIES,
  normalizeCurrency,
  type Currency
} from '@/lib/priceGuide'
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
    const p = card.manual_price ?? card.price ?? card.price_override
    return p != null ? String(p) : ''
  })
  const [currency, setCurrency] = useState<Currency>(() => normalizeCurrency(card.currency))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  const hasAutoPrice = card.market_price != null && card.market_price > 0

  const guideUrls = {
    pc: buildPriceChartingUrl({ cardName: card.card_name, setId: card.set_id, set_name: card.set_name, number: card.number, language }),
    eb: buildEbayUrl({ cardName: card.card_name, setId: card.set_id, set_name: card.set_name, number: card.number, language }),
    cm: buildCardmarketUrl({ cardName: card.card_name, setId: card.set_id, set_name: card.set_name, number: card.number, language })
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

      {/* Links de referencia — inline, compactos */}
      <div className="flex gap-1.5">
        <a href={guideUrls.pc} target="_blank" rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-sky-500/40 hover:text-sky-300">
          PriceCharting
        </a>
        <a href={guideUrls.eb} target="_blank" rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-300">
          eBay
        </a>
        <a href={guideUrls.cm} target="_blank" rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-center text-[11px] font-medium text-slate-400 transition-colors hover:border-amber-500/40 hover:text-amber-300">
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
