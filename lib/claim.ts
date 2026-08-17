import type { SupabaseClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/cardStatus'
import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'
import { formatPrice } from '@/lib/priceGuide'

// ---------------------------------------------------------------------------
// WhatsApp Claim — lógica compartida del circuito de compra/venta:
//  - Mensaje del comprador hacia el vendedor (deep link wa.me).
//  - Texto estructurado del "Kit de Claim" para pegar en grupos.
//  - Reversión de soft locks expirados (reserved_until < now).
// ---------------------------------------------------------------------------

export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h de reserva

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

const fmtPrice = (n: number | null, currency?: string | null) =>
  n != null ? formatPrice(n, currency) : 'consultar precio'

// Mensaje del comprador → vendedor (se abre en WhatsApp tras el CLAIM).
// Placeholders: {CARD_NAME} {SET_NUMBER} {PRICE} {CONDITION} {BINDER_SLOT_URL}
export function claimMessage(p: ClaimParams): string {
  const seller = p.sellerName ? `@${p.sellerName}` : 'coleccionista'
  const cond = p.condition ? ` (Estado: ${p.condition})` : ''
  const lang = p.language ? ` (Idioma: ${CARD_LANGUAGE_META[normalizeLanguage(p.language)].label})` : ''
  return [
    `¡Hola ${seller}! Vengo de tu Binder en Profesor TCG.`,
    `Hice el CLAIM de la carta *${p.cardName}* (#${p.setId.toUpperCase()} ${p.number})${cond}${lang} por ${fmtPrice(p.price, p.currency)}.`,
    '¿Cómo coordinamos el pago y el envío? 🚀'
  ].join('\n')
}

// Texto estructurado del Kit de Claim: listo para pegar en un grupo de WhatsApp.
// Incluye nombre, set/número, precio, condición y el link único al slot.
export function sellerKitText(p: ClaimParams): string {
  const lines = [
    '📦 *EN VENTA* · Profesor TCG',
    '━━━━━━━━━━━━━━━━━━━━'
  ]
  lines.push(`🃏 *${p.cardName}*`)
  lines.push(`📚 Set ${p.setId.toUpperCase()} · #${p.number}`)
  if (p.language) lines.push(`🌐 Idioma: ${CARD_LANGUAGE_META[normalizeLanguage(p.language)].label}`)
  lines.push(`🏷️ Precio: 💵 *${fmtPrice(p.price, p.currency)}*`)
  if (p.condition) lines.push(`✨ Estado: ${p.condition}`)
  lines.push('')
  lines.push(`🔗 Mirala en mi Binder 3D: ${p.binderSlotUrl}`)
  lines.push('')
  lines.push('⚡ *Primer claim por WhatsApp se la lleva.* ¡Hacé tu claim!')
  return lines.join('\n')
}

// Deep link de WhatsApp con el mensaje ya encodificado
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

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
