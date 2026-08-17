import { describe, expect, it } from 'vitest'
import { pruneRequestTimes } from './pokeWallet'

const HOUR = 60 * 60 * 1000

describe('pruneRequestTimes (guard de cuota PokeWallet)', () => {
  it('mantiene los pedidos dentro de la ventana de 1 hora', () => {
    const now = 1_000_000_000_000
    const times = [now - HOUR - 1000, now - HOUR, now - 30 * 60 * 1000, now, now + 5000]
    const pruned = pruneRequestTimes(times, now, HOUR)
    expect(pruned).toEqual([now - HOUR, now - 30 * 60 * 1000, now, now + 5000])
  })

  it('deja la ventana vacía cuando todo expiró', () => {
    const now = 1_000_000_000_000
    const times = [now - 2 * HOUR, now - HOUR - 1]
    expect(pruneRequestTimes(times, now, HOUR)).toEqual([])
  })

  it('no muta el array original si no hace falta', () => {
    const now = 1_000_000_000_000
    const times = [now - 1000]
    expect(pruneRequestTimes(times, now, HOUR)).toEqual(times)
  })
})
