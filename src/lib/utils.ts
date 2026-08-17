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

/** Sesión expirada: el middleware redirigió la llamada a /login. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Tu sesión expiró. Volvé a iniciar sesión.')
    this.name = 'SessionExpiredError'
  }
}

/**
 * fetch que parsea JSON y valida la respuesta antes de leerla.
 *
 * Sin esto, cuando la sesión expira el middleware de Next redirige las rutas
 * protegidas a /login, el fetch sigue la redirección y recibe el HTML de la
 * página de login: `res.json()` rompe con "Unexpected token '<'...".
 * Acá detectamos esa redirección y tiramos un error claro, y si la respuesta
 * no es JSON real mostramos un mensaje amigable en vez del error crudo.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(input, init)

  // El fetch sigue las redirecciones: si terminamos en /login, la sesión expiró
  if (res.url.includes('/login')) {
    throw new SessionExpiredError()
  }

  const text = await res.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Respuesta inesperada del servidor. Probá de nuevo.')
  }

  if (!res.ok) {
    const raw =
      data && typeof data === 'object' && 'error' in data
        ? (data as { error: unknown }).error
        : undefined
    const message = typeof raw === 'string' && raw ? raw : 'Error del servidor'
    throw new Error(message)
  }

  return data as T
}