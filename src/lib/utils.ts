// ============================================================================
// Helpers generales compartidos por toda la app.
//
// `cn` mergea clases condicionales de Tailwind resolviendo conflictos de
// especificidad: si una clase sobrescribe a otra (p. ej. bordes brillantes
// según el tipo de energía o la rareza de una carta), tailwind-merge
// conserva solo la última ganadora en vez de emitir ambas.
// ============================================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Une clases condicionales y resuelve conflictos de especificidad de Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

const CURRENCY_FORMATTERS: Record<'USD' | 'ARS', Intl.NumberFormat> = {
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol'
  }),
  ARS: new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    currencyDisplay: 'narrowSymbol'
  })
}

/** Formatea un monto con el símbolo oficial de la moneda ($ y ARS separador). */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'ARS' = 'USD'
): string {
  return CURRENCY_FORMATTERS[currency].format(amount)
}

/** Genera una URL limpia a partir de un nombre (set, usuario, etc.). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}