import type { SupabaseClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/cardStatus'

// ---------------------------------------------------------------------------
// WhatsApp Claim — lógica compartida del circuito de compra/venta:
//  - Reversión de soft locks expirados (reserved_until < now).
//  - Precio efectivo y URL pública del slot.
// Los mensajes y deep links de WhatsApp viven en lib/whatsapp.ts (re-exportados).
// ---------------------------------------------------------------------------

export { buildWhatsAppLink, claimMessage, sellerKitText, type ClaimParams } from './whatsapp'

export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h de reserva

// Precio efectivo de una carta para el claim (price > override > mercado)
export function claimPrice(card: {
  market_price: number | null
  price_override?: number | null
  price?: number | null
}): number | null {
  return effectivePrice(card.market_price, card.price_override, card.price)
}

// URL pública del slot de la carta (deep link a la posición exacta del binder)
export function binderSlotUrl(username: string | null | undefined, cardId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const userPath = username ? `/binder/${encodeURIComponent(username)}` : '/binder'
  return `${base}${userPath}?card=${cardId}`
}

// Revertir soft locks expirados: las cartas 'reserved' con reserved_until vencido
// vuelven a su disponibilidad según sus flags (is_for_sale / is_for_trade).
// Devuelve cuántas reservas revirtió.
//
// Es best-effort: si la columna no existe todavía (migración pendiente) o hay
// cualquier error transitorio, se traga el problema y devuelve 0 — un revert
// de mantenimiento nunca debe romper una lectura del binder.
export async function revertExpiredReservations(admin: SupabaseClient): Promise<number> {
  try {
    const now = new Date().toISOString()
    const { data: expired, error } = await admin
      .from('binder_cards')
      .select('id, is_for_sale, is_for_trade')
      .eq('status', 'reserved')
      .lt('reserved_until', now)
      .limit(500)
    if (error) return 0
    if (!expired || expired.length === 0) return 0

    const byStatus: Record<string, string[]> = { for_sale: [], for_trade: [], collection: [] }
    for (const c of expired) {
      const s = c.is_for_sale ? 'for_sale' : c.is_for_trade ? 'for_trade' : 'collection'
      byStatus[s].push(c.id)
    }
    for (const [status, ids] of Object.entries(byStatus)) {
      if (ids.length === 0) continue
      await admin.from('binder_cards').update({ status, reserved_until: null }).in('id', ids)
    }
    return expired.length
  } catch {
    return 0
  }
}
