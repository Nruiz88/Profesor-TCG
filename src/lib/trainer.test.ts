import { describe, expect, it } from 'vitest'
import { computeTrainerScore, TRAINER_XP, TRAINER_RANKS } from './trainer'

const empty = {
  capturedSpecies: 0,
  completedSales: 0,
  completedTrades: 0,
  completedBuys: 0,
  reviewCount: 0
}

describe('computeTrainerScore', () => {
  it('arranca en Aprendiz con 0 XP', () => {
    const s = computeTrainerScore(empty)
    expect(s.xp).toBe(0)
    expect(s.rank.name).toBe('Aprendiz')
    expect(s.rank.icon).toBe('🥉')
    expect(s.nextRank?.name).toBe('Coleccionista')
    expect(s.progress).toBe(0)
    expect(s.remainingXp).toBe(TRAINER_RANKS[1].min)
  })

  it('suma XP por cada actividad', () => {
    const s = computeTrainerScore({
      capturedSpecies: 6,
      completedSales: 2,
      completedTrades: 1,
      completedBuys: 4,
      reviewCount: 3
    })
    expect(s.breakdown.captures.xp).toBe(6 * TRAINER_XP.perCapture)
    expect(s.breakdown.sales.xp).toBe(2 * TRAINER_XP.perSale)
    expect(s.breakdown.trades.xp).toBe(1 * TRAINER_XP.perTrade)
    expect(s.breakdown.buys.xp).toBe(4 * TRAINER_XP.perBuy)
    expect(s.breakdown.reviews.xp).toBe(3 * TRAINER_XP.perReview)
    expect(s.xp).toBe(
      6 * TRAINER_XP.perCapture +
        2 * TRAINER_XP.perSale +
        1 * TRAINER_XP.perTrade +
        4 * TRAINER_XP.perBuy +
        3 * TRAINER_XP.perReview
    )
  })

  it('sube de rango según el XP acumulado', () => {
    expect(computeTrainerScore({ ...empty, capturedSpecies: 9 }).rank.name).toBe('Aprendiz')
    expect(computeTrainerScore({ ...empty, capturedSpecies: 10 }).rank.name).toBe('Coleccionista')
    expect(computeTrainerScore({ ...empty, completedSales: 10 }).rank.name).toBe('Entrenador')
    expect(computeTrainerScore({ ...empty, completedSales: 20 }).rank.name).toBe('Experto')
    expect(computeTrainerScore({ ...empty, completedSales: 34 }).rank.name).toBe('Maestro')
    expect(computeTrainerScore({ ...empty, completedSales: 50 }).rank.name).toBe('Leyenda')
  })

  it('Leyenda no tiene siguiente rango y progreso completo', () => {
    const s = computeTrainerScore({ ...empty, completedSales: 60 })
    expect(s.rank.name).toBe('Leyenda')
    expect(s.nextRank).toBeNull()
    expect(s.remainingXp).toBeNull()
    expect(s.progress).toBe(1)
  })

  it('el progreso hacia el siguiente rango es proporcional', () => {
    // Coleccionista va de 100 a 300 XP: a 200 XP debería estar al 50 %
    const s = computeTrainerScore({ ...empty, capturedSpecies: 20 })
    expect(s.rank.name).toBe('Coleccionista')
    expect(s.nextRank?.name).toBe('Entrenador')
    expect(s.progress).toBeCloseTo(0.5)
    expect(s.remainingXp).toBe(100)
  })
})
