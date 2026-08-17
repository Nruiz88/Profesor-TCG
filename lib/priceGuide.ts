import type { CardLanguage } from './cardLanguage'
import { isCardLanguage } from './cardLanguage'

// Monedas soportadas para el precio manual de una carta
export type Currency = 'USD' | 'EUR' | 'ARS'

export const CURRENCIES: { id: Currency; label: string; symbol: string }[] = [
  { id: 'USD', label: 'Dólar (USD)', symbol: '$' },
  { id: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { id: 'ARS', label: 'Peso (ARS)', symbol: '$' }
]

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && CURRENCIES.some((c) => c.id === value)
}

export function normalizeCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : 'USD'
}

// Formato compacto para badges: $15.00 · €15.00 · $15.00 ARS
export function formatPrice(value: number, currency: unknown): string {
  const c = normalizeCurrency(currency)
  const n = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  if (c === 'EUR') return `€${n}`
  if (c === 'ARS') return `$${n} ARS`
  return `$${n}`
}

// Metadatos comunes para armar búsquedas externas: nombre + número + set
// (nombre si está disponible, si no el código), con el calificador de idioma
// para copias que no sean inglés (TCGplayer, eBay y Cardmarket separan idiomas).
function queryParts(opts: {
  cardName: string
  setId: string
  set_name?: string | null
  number: string
  language?: string | null
}, langWord: string | null): string[] {
  const set = (opts.set_name ?? '').trim() || opts.setId.toUpperCase()
  const parts = [opts.cardName, opts.number, set]
  if (langWord) parts.push(langWord)
  return parts.filter(Boolean)
}

// Palabra de idioma para eBay / Cardmarket: separan todas las impresiones.
// PriceCharting solo separa japonés, así que esa URL pasa null salvo para JP.
function languageWordFor(opts: {
  language?: string | null
}, onlyJapanese = false): string | null {
  if (!opts.language || !isCardLanguage(opts.language)) return null
  if (onlyJapanese) return opts.language === 'JP' ? 'Japanese' : null
  return LANGUAGE_WORD[opts.language]
}

const LANGUAGE_WORD: Record<CardLanguage, string | null> = {
  ES: 'Spanish',
  EN: null,
  JP: 'Japanese',
  KO: 'Korean',
  ZH: 'Chinese'
}

// Deep link explícito a la búsqueda de referencia en PriceCharting, armado con
// los metadatos de la carta. Para copias japonesas se agrega el calificador
// "Japanese" (PriceCharting separa esos precios en su propia serie).
export function buildPriceChartingUrl(opts: {
  cardName: string
  setId: string
  set_name?: string | null
  number: string
  language?: string | null
}): string {
  const q = queryParts(opts, languageWordFor(opts, true))
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q.join(' '))}`
}

// eBay: búsqueda directa de la carta en ventas REALES (sold + completed), que
// es la referencia más fiable para cartas importadas y ediciones especiales
// (JP/KO/ZH) que TCGplayer no cubre. Funciona sin API key.
export function buildEbayUrl(opts: {
  cardName: string
  setId: string
  set_name?: string | null
  number: string
  language?: string | null
}): string {
  const q = queryParts(opts, languageWordFor(opts)).join(' ')
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`
}

// Cardmarket: búsqueda directa de singles (mercado europeo, buenos precios
// para cartas en inglés y español). Funciona sin API key.
export function buildCardmarketUrl(opts: {
  cardName: string
  setId: string
  set_name?: string | null
  number: string
  language?: string | null
}): string {
  const q = queryParts(opts, languageWordFor(opts)).join(' ')
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(q)}`
}
