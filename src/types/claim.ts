// ============================================================================
// Contrato de Transacciones (Claim) y Reputación.
// Fuente única de verdad para el circuito de compra/venta por WhatsApp.
//
// lib/claim.ts y lib/reputation.ts implementan la lógica y re-exportan estos
// tipos para mantener compatibilidad con los imports existentes.
// ============================================================================

// ---------------------------------------------------------------------------
// Claim (transacción)
// ---------------------------------------------------------------------------

/** Tipo de transacción registrada en la tabla `claims`. */
export type ClaimKind = 'sale' | 'trade' | 'both'

/** Ciclo de vida de un claim. */
export type ClaimStatus = 'pending' | 'completed' | 'cancelled'

/** Fila de la tabla `claims` (transacción entre comprador y vendedor). */
export interface ClaimRecord {
  id: string
  buyer_id: string
  seller_id: string
  card_id: string | null
  kind: ClaimKind
  status: ClaimStatus
  created_at: string
  completed_at: string | null
}

/**
 * Parámetros para armar el mensaje de WhatsApp y el Kit de Claim.
 * Lo que necesita el deep link de wa.me para coordinar la compra.
 */
export interface ClaimParams {
  cardName: string
  setId: string
  number: string
  price: number | null
  condition?: string | null
  language?: string | null
  currency?: string | null
  binderSlotUrl: string
  sellerName?: string | null
}

// ---------------------------------------------------------------------------
// Reputación y reseñas
// ---------------------------------------------------------------------------

/** Resumen de reputación de un usuario (calculado desde profiles + reviews). */
export interface ReputationInfo {
  username: string
  /** null si todavía no tiene reseñas (rating_avg default 5.00 no es real). */
  ratingAvg: number | null
  reviewCount: number
  totalSales: number
  totalTrades: number
  isVerified: boolean
  city: string | null
  country: string | null
  /** claims completados como vendedor (transacciones exitosas). */
  completedClaims: number
}

/** Fila de la tabla `reviews`. */
export interface ReviewRecord {
  id: string
  claim_id: string
  reviewer_id: string
  reviewed_user_id: string
  rating: number
  tags: string[]
  comment: string | null
  created_at: string
}

/** Tag predefinido de una reseña (etiquetas de confianza). */
export interface ReviewTag {
  id: string
  label: string
}