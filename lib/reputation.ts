// ============================================================================
// Sistema de Reputación y Badges de Confianza.
// Tipos compartidos, etiquetas de reseña y cálculo de nivel (PRO / VERIFICADO).
// ============================================================================

export interface ReputationInfo {
  username: string
  /** null si todavía no tiene reseñas (rating_avg default 5.00 no es real) */
  ratingAvg: number | null
  reviewCount: number
  totalSales: number
  totalTrades: number
  isVerified: boolean
  city: string | null
  country: string | null
  /** claims completados como vendedor (transacciones exitosas) */
  completedClaims: number
}

export interface ReviewTag {
  id: string
  label: string
}

export const REVIEW_TAGS: ReviewTag[] = [
  { id: 'envio_rapido', label: '📦 Envío Rápido' },
  { id: 'estado_impecable', label: '🎴 Estado Impecable (NM)' },
  { id: 'entrega_puntual', label: '🤝 Entrega Puntual' },
  { id: 'buena_comunicacion', label: '💬 Buena Comunicación' }
]

export function isReviewTag(id: string): boolean {
  return REVIEW_TAGS.some((t) => t.id === id)
}

// Nivel del usuario según su reputación:
//   ⚡ VERIFICADO (verificado por el admin) > 🏆 PRO (5+ transacciones) > ✨ NUEVO
export function levelBadge(info: {
  isVerified: boolean
  completedClaims: number
}): { label: string; icon: string } {
  if (info.isVerified) return { label: 'VERIFICADO', icon: '⚡' }
  if (info.completedClaims >= 5) return { label: 'PRO', icon: '🏆' }
  return { label: 'NUEVO', icon: '✨' }
}

// Formato de ubicación geográfica (mismo criterio que lib/profile)
export function formatReputationLocation(city: string | null, country: string | null): string {
  const parts = [city, country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : ''
}
