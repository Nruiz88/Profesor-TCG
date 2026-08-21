import type { SupabaseClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/cardStatus'
import { shortCardId, slugify } from '@/lib/utils'

// ---------------------------------------------------------------------------
// WhatsApp Claim — lógica compartida del circuito de compra/venta:
//  - Reversión de soft locks expirados (reserved_until < now).
//  - Precio efectivo y URL pública del slot.
// Los mensajes y deep links de WhatsApp viven en lib/whatsapp.ts (re-exportados).
// ---------------------------------------------------------------------------

export {
  buildWhatsAppLink,
  claimMessage,
  formatWhatsAppMessage,
  generateWhatsAppUrl,
  normalizeWhatsAppLanguage,
  sanitizeWhatsAppPhone,
  sanitizeWhatsAppText,
  sellerKitText,
  type ClaimParams,
  type WhatsAppLanguage,
  type WhatsAppMessageParams
} from './whatsapp'

export const CLAIM_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h de reserva

// Tiempo restante de una reserva (soft lock) en formato compacto:
// "23h 12m", "1h 5m", "45m"… 0 (o negativo) devuelve "0m".
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h`
  }
  if (h > 0) return `${h}h ${m}m`
  return `${Math.max(1, m)}m`
}

// Fecha/hora en que vence una reserva, en formato local corto:
// "hoy 18:30", "mañana 14:00", "20 ago 09:15"… Devuelve null si no hay
// fecha válida.
export function formatReservedUntil(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return `hoy ${time}`
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return `mañana ${time}`
  const datePart = d
    .toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    .replace(/[-/.\s]+/g, ' ')
    .trim()
  return `${datePart} ${time}`
}

// Precio efectivo de una carta para el claim (price > override > mercado)
export function claimPrice(card: {
  market_price: number | null
  price_override?: number | null
  price?: number | null
  manual_price?: number | null
}): number | null {
  return effectivePrice(card.market_price, card.price_override, card.price, card.manual_price)
}

// URL pública de la carta (página /card/[id]/[slug] con su og:image propia).
// El preview de WhatsApp muestra la carta real (nombre, set y precio), no la
// portada del binder.
//
// Si el id es un UUID de slot (binder_cards.id) se comparte la versión corta
// /c/<short> (8 chars) que redirige a la canónica. Los card_id del catálogo
// (ej. "base1-4") no son UUID y se mantienen como /card/<id>/<slug>.
export function cardPublicUrl(cardId: string, cardName: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const isSlotUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/.test(cardId)
  if (isSlotUuid) {
    return `${base}/c/${shortCardId(cardId)}`
  }
  return `${base}/card/${cardId}/${slugify(cardName)}`
}

// Revertir soft locks expirados: las cartas 'reserved' con reserved_until vencido
// vuelven a su disponibilidad según sus flags (is_for_sale / is_for_trade).
// Devuelve cuántas reservas revirtió.
//
// Es best-effort: si la columna no existe todavía (migración pendiente) o hay
// cualquier error transitorio, se traga el problema y devuelve 0 — un revert
// de mantenimiento nunca debe romper una lectura del binder.
// Throttle por instancia: la reversión de reservas expiradas se ejecuta como
// máximo cada minIntervalMs (por defecto 0 = siempre). En el path caliente de
// las vistas públicas de binder se pasa un intervalo para no escribir en DB
// con cada request.
let lastRevertAt = 0
export async function revertExpiredReservations(
  admin: SupabaseClient,
  opts?: { minIntervalMs?: number }
): Promise<number> {
  const minInterval = opts?.minIntervalMs ?? 0
  if (minInterval > 0) {
    const now = Date.now()
    if (now - lastRevertAt < minInterval) return 0
    lastRevertAt = now
  }
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
