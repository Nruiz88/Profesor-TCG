import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatCountdown, formatReservedUntil } from './claim'

const FIXED_NOW = new Date('2026-01-01T12:00:00Z')

afterEach(() => {
  vi.useRealTimers()
})

describe('formatCountdown', () => {
  it('devuelve minutos cuando falta menos de una hora', () => {
    expect(formatCountdown(45 * 60 * 1000)).toBe('45m')
  })

  it('nunca devuelve 0m: pisa en 1m para una reserva que está por vencer', () => {
    expect(formatCountdown(10 * 1000)).toBe('1m')
  })

  it('devuelve horas y minutos con más de una hora', () => {
    expect(formatCountdown(2 * 3600 * 1000 + 5 * 60 * 1000)).toBe('2h 5m')
  })

  it('devuelve días y horas con más de 24 horas', () => {
    expect(formatCountdown(26 * 3600 * 1000)).toBe('1d 2h')
  })

  it('pisa en 0 para valores negativos o nulos', () => {
    expect(formatCountdown(-5000)).toBe('0m')
    expect(formatCountdown(0)).toBe('0m')
  })
})

describe('formatReservedUntil', () => {
  it('devuelve null para valores vacíos o inválidos', () => {
    expect(formatReservedUntil(null)).toBeNull()
    expect(formatReservedUntil(undefined)).toBeNull()
    expect(formatReservedUntil('no-es-una-fecha')).toBeNull()
  })

  it('dice "hoy" cuando vence el mismo día', () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    const later = new Date(FIXED_NOW.getTime() + 3 * 3600 * 1000)
    const out = formatReservedUntil(later.toISOString())
    expect(out).toMatch(/^hoy \d{2}:\d{2}$/)
  })

  it('dice "mañana" cuando vence al día siguiente', () => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
    const tomorrow = new Date(FIXED_NOW)
    tomorrow.setDate(FIXED_NOW.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)
    expect(formatReservedUntil(tomorrow.toISOString())).toMatch(/^mañana 12:00$/)
  })
})
