// ============================================================================
// Helpers generales compartidos por toda la app.
// ============================================================================

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false

/** Une clases de Tailwind descartando valores falsy (usa clsx/tailwind-merge si se agregan). */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(' ')
}

const MONEY_CURRENCIES: Record<string, { symbol: string; suffix: string }> = {
  USD: { symbol: '$', suffix: '' },
  EUR: { symbol: '€', suffix: '' },
  ARS: { symbol: '$', suffix: ' ARS' }
}

function moneyParts(currency: string) {
  return (
    MONEY_CURRENCIES[currency] ?? {
      symbol: '$',
      suffix: currency !== 'USD' ? ` ${currency}` : ''
    }
  )
}

/** Formatea un número como moneda (USD/EUR/ARS). null → 'consultar precio'. */
export function formatMoney(
  value: number | null | undefined,
  currency: string = 'USD'
): string {
  if (value == null) return 'consultar precio'
  const { symbol, suffix } = moneyParts(currency)
  const n = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${symbol}${n}${suffix}`
}