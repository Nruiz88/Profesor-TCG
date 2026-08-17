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

// Deep link explícito a la búsqueda de referencia en PriceCharting, armado con
// los metadatos de la carta. Para copias japonesas se agrega el calificador
// "Japanese" (PriceCharting separa esos precios en su propia serie).
export function buildPriceChartingUrl(opts: {
  cardName: string
  setId: string
  number: string
  language?: string | null
}): string {
  const q = [
    opts.cardName,
    opts.setId.toUpperCase(),
    opts.number,
    opts.language === 'JP' ? 'Japanese' : ''
  ]
    .filter(Boolean)
    .join(' ')
  return `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}`
}

// TCGplayer no filtra por idioma en el texto de búsqueda: usa el parámetro
// de query `Language=` (ej: ?q=Pikachu%20151&Language=English), igual que el
// deep link de un producto como el que genera el propio sitio.
const TCGPLAYER_LANGUAGE: Record<CardLanguage, string> = {
  ES: 'Spanish',
  EN: 'English',
  JP: 'Japanese',
  KO: 'Korean',
  ZH: 'Chinese'
}

export function buildTcgplayerUrl(opts: {
  cardName: string
  setId: string
  number: string
  language?: string | null
}): string {
  const q = [opts.cardName, opts.number].filter(Boolean).join(' ')
  const lang =
    opts.language && isCardLanguage(opts.language)
      ? TCGPLAYER_LANGUAGE[opts.language]
      : null
  const langParam = lang ? `&Language=${encodeURIComponent(lang)}` : ''
  return `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(q)}${langParam}`
}
