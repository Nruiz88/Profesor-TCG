// ============================================================================
// Puntos de Entrenador: XP unificada que se luce en el perfil público.
// Cada actividad suma XP (capturas, ventas, cambios, compras y reseñas) y el
// total define un rango tipo Pokémon (Aprendiz → Leyenda). 100% cosmético por
// ahora: no da nada, solo reputación visual. Lógica pura, testeable.
// ============================================================================

export interface TrainerRank {
  min: number
  icon: string
  name: string
}

// Escalera de rangos por XP acumulada (la Pokédex tiene su propia escalera,
// por especies capturadas; esta es la de actividad).
export const TRAINER_RANKS: TrainerRank[] = [
  { min: 0, icon: '🥉', name: 'Aprendiz' },
  { min: 100, icon: '🥈', name: 'Coleccionista' },
  { min: 300, icon: '🥇', name: 'Entrenador' },
  { min: 600, icon: '💎', name: 'Experto' },
  { min: 1000, icon: '🔥', name: 'Maestro' },
  { min: 1500, icon: '👑', name: 'Leyenda' }
]

// XP por unidad de cada actividad.
export const TRAINER_XP = {
  /** Por especie Pokémon distinta capturada en los binders. */
  perCapture: 10,
  /** Por venta completada como vendedor. */
  perSale: 30,
  /** Por intercambio completado como vendedor. */
  perTrade: 25,
  /** Por compra/claim completado como comprador. */
  perBuy: 15,
  /** Por reseña recibida. */
  perReview: 5
} as const

export interface TrainerInput {
  capturedSpecies: number
  completedSales: number
  completedTrades: number
  completedBuys: number
  reviewCount: number
}

export interface TrainerPart {
  count: number
  xp: number
}

export interface TrainerScore {
  xp: number
  rank: TrainerRank
  nextRank: TrainerRank | null
  /** 0..1 de progreso hacia el siguiente rango. */
  progress: number
  /** XP que faltan para subir al siguiente rango (null si es Leyenda). */
  remainingXp: number | null
  breakdown: {
    captures: TrainerPart
    sales: TrainerPart
    trades: TrainerPart
    buys: TrainerPart
    reviews: TrainerPart
  }
}

export function computeTrainerScore(input: TrainerInput): TrainerScore {
  const breakdown = {
    captures: { count: input.capturedSpecies, xp: input.capturedSpecies * TRAINER_XP.perCapture },
    sales: { count: input.completedSales, xp: input.completedSales * TRAINER_XP.perSale },
    trades: { count: input.completedTrades, xp: input.completedTrades * TRAINER_XP.perTrade },
    buys: { count: input.completedBuys, xp: input.completedBuys * TRAINER_XP.perBuy },
    reviews: { count: input.reviewCount, xp: input.reviewCount * TRAINER_XP.perReview }
  }

  const xp =
    breakdown.captures.xp +
    breakdown.sales.xp +
    breakdown.trades.xp +
    breakdown.buys.xp +
    breakdown.reviews.xp

  // Rango máximo que alcanza el XP acumulado
  let rank = TRAINER_RANKS[0]
  for (const r of TRAINER_RANKS) {
    if (xp >= r.min) rank = r
  }

  const index = TRAINER_RANKS.indexOf(rank)
  const nextRank = TRAINER_RANKS[index + 1] ?? null

  const progress = nextRank
    ? Math.min(1, (xp - rank.min) / Math.max(1, nextRank.min - rank.min))
    : 1

  return {
    xp,
    rank,
    nextRank,
    progress,
    remainingXp: nextRank ? Math.max(0, nextRank.min - xp) : null,
    breakdown
  }
}
