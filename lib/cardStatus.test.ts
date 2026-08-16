import { describe, expect, it } from 'vitest'
import {
  availabilityBadgeText,
  availabilityFromFlags,
  availabilityToFlags,
  effectivePrice,
  statusFromAvailability
} from './cardStatus'

describe('availabilityFromFlags', () => {
  it('mapea flags de la DB a modalidad', () => {
    expect(availabilityFromFlags(false, false)).toBe('solo_coleccion')
    expect(availabilityFromFlags(true, false)).toBe('solo_venta')
    expect(availabilityFromFlags(false, true)).toBe('solo_cambio')
    expect(availabilityFromFlags(true, true)).toBe('venta_o_cambio')
    expect(availabilityFromFlags(null, null)).toBe('solo_coleccion')
  })
})

describe('availabilityToFlags', () => {
  it('mapea modalidad a flags de la DB', () => {
    expect(availabilityToFlags('solo_coleccion')).toEqual({
      isForSale: false,
      isForTrade: false
    })
    expect(availabilityToFlags('solo_venta')).toEqual({ isForSale: true, isForTrade: false })
    expect(availabilityToFlags('solo_cambio')).toEqual({ isForSale: false, isForTrade: true })
    expect(availabilityToFlags('venta_o_cambio')).toEqual({ isForSale: true, isForTrade: true })
  })
})

describe('statusFromAvailability', () => {
  it('deriva el status legacy', () => {
    expect(statusFromAvailability('solo_coleccion')).toBe('collection')
    expect(statusFromAvailability('solo_venta')).toBe('for_sale')
    expect(statusFromAvailability('solo_cambio')).toBe('for_trade')
    expect(statusFromAvailability('venta_o_cambio')).toBe('for_sale')
  })
})

describe('effectivePrice', () => {
  it('el precio manual prima sobre el override legacy y el de mercado', () => {
    expect(effectivePrice(10, 12, 15)).toBe(15)
    expect(effectivePrice(10, 12)).toBe(12)
    expect(effectivePrice(10, null, 0)).toBe(10)
    expect(effectivePrice(null, null, null)).toBe(null)
    expect(effectivePrice(null, null)).toBe(null)
  })
})

describe('availabilityBadgeText', () => {
  it('genera los textos según modalidad', () => {
    expect(availabilityBadgeText('solo_coleccion', null)).toBe('Colección')
    expect(availabilityBadgeText('solo_venta', 15)).toBe('En venta - $15.00')
    expect(availabilityBadgeText('solo_venta', null)).toBe('En venta')
    expect(availabilityBadgeText('solo_cambio', null)).toBe('🔄 Solo Trade')
    expect(availabilityBadgeText('venta_o_cambio', 15)).toBe('💵 $15.00 / 🔄 Trade')
    expect(availabilityBadgeText('venta_o_cambio', null)).toBe('💵 En venta / 🔄 Trade')
  })
})
