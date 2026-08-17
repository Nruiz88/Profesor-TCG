'use client'

// Claim anónimo → login: guardamos la intención de reservar (card_id) para
// aplicarla automáticamente apenas haya sesión — desde /login tras autenticarse
// o, como fallback (p. ej. confirmación de email pendiente), al volver a la
// carta y abrir el ClaimModal.

const PENDING_CLAIM_KEY = 'freebuff:pending_claim'
const TTL_MS = 60 * 60 * 1000 // 1 h: tiempo razonable entre el claim y el login

export interface PendingClaim {
  cardId: string
  at: number
}

export function readPendingClaim(): PendingClaim | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(PENDING_CLAIM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingClaim>
    if (typeof parsed.cardId !== 'string' || typeof parsed.at !== 'number') return null
    if (Date.now() - parsed.at > TTL_MS) {
      window.localStorage.removeItem(PENDING_CLAIM_KEY)
      return null
    }
    return { cardId: parsed.cardId, at: parsed.at }
  } catch {
    return null
  }
}

export function savePendingClaim(cardId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify({ cardId, at: Date.now() }))
  } catch {
    /* sin storage disponible */
  }
}

export function clearPendingClaim(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PENDING_CLAIM_KEY)
  } catch {
    /* sin storage disponible */
  }
}
