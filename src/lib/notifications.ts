import { createClient as createAdminClient } from '@supabase/supabase-js'

// Alertas in-app: cuando alguien PUBLICA una carta (venta/cambio) que está en
// la wantlist de otros usuarios, se les crea una notificación para que no se
// pierdan la oportunidad. Los inserts usan service role (los receptores son
// terceros, no el que publica).

export const NOTIFICATION_TYPE_WANTLIST = 'wantlist'
export const NOTIFICATION_TYPE_CLAIM = 'claim'

export interface WantlistPublishEvent {
  binderCardId: string
  cardId: string
  cardName: string
  setId: string
  number: string
  price: number | null
  sellerId: string
  sellerUsername: string
}

/**
 * Crea notificaciones de wantlist para los usuarios que buscan esta carta.
 * Reglas:
 * - Excluye al vendedor (no se avisa a sí mismo).
 * - Si el usuario puso un presupuesto máximo y el precio se conoce, solo avisa
 *   si el precio entra en el presupuesto.
 * - Dedupe: no avisar dos veces la misma carta al mismo usuario en 24 h.
 * Nunca lanza: el aviso no debe romper la publicación de la carta.
 */
export async function notifyWantlistMatches(event: WantlistPublishEvent): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return
  const admin = createAdminClient(url, serviceKey)

  try {
    const { data: wantlist } = await admin
      .from('wantlist_cards')
      .select('user_id, max_budget')
      .eq('card_id', event.cardId)
    if (!wantlist || wantlist.length === 0) return

    const users = [...new Set(wantlist.map((w) => w.user_id as string))]

    // Dedupe: notificaciones recientes (24 h) de esta misma carta
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await admin
      .from('notifications')
      .select('user_id')
      .eq('type', NOTIFICATION_TYPE_WANTLIST)
      .in('user_id', users)
      .gte('created_at', since)
    const alreadyNotified = new Set((recent || []).map((n) => n.user_id as string))

    const rows = wantlist
      .filter((w) => {
        const userId = w.user_id as string
        if (userId === event.sellerId) return false
        if (alreadyNotified.has(userId)) return false
        if (w.max_budget != null && event.price != null && event.price > Number(w.max_budget)) {
          return false
        }
        return true
      })
      .map((w) => ({
        user_id: w.user_id,
        type: NOTIFICATION_TYPE_WANTLIST,
        payload: {
          card_id: event.cardId,
          binder_card_id: event.binderCardId,
          card_name: event.cardName,
          set_id: event.setId,
          number: event.number,
          price: event.price,
          seller_username: event.sellerUsername
        }
      }))

    if (rows.length === 0) return
    await admin.from('notifications').insert(rows)
  } catch {
    // silencioso: el aviso es best-effort
  }
}

export interface ClaimEvent {
  sellerId: string
  buyerUsername: string
  buyerPhone: string
  binderCardId: string
  cardName: string
  setId: string
  number: string
}

/**
 * Crea una notificación in-app al vendedor cuando un comprador le hace un
 * CLAIM sobre una de sus cartas (reserva 24h). Los inserts usan service role
 * porque el receptor es un tercero. Nunca lanza: el aviso no debe romper el
 * claim.
 */
export async function notifySellerOfClaim(event: ClaimEvent): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return
  const admin = createAdminClient(url, serviceKey)

  try {
    // Deep link de WhatsApp dirigido al comprador: si el vendedor toca la
    // notificación, se le abre WhatsApp con el mensaje prefillado.
    const phone = String(event.buyerPhone ?? '').replace(/\D/g, '')
    const message = [
      `¡Hola @${event.buyerUsername || 'coleccionista'}!`,
      `Soy el vendedor de *${event.cardName}* (#${event.setId.toUpperCase()} ${event.number}) en TCG Claim.`,
      'Te confirmé el claim, coordinemos el pago y el envío. 🚀'
    ].join('\n')
    const whatsappUrl =
      phone.length > 0
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : null

    await admin.from('notifications').insert({
      user_id: event.sellerId,
      type: NOTIFICATION_TYPE_CLAIM,
      payload: {
        binder_card_id: event.binderCardId,
        card_name: event.cardName,
        set_id: event.setId,
        number: event.number,
        buyer_username: event.buyerUsername,
        whatsapp_url: whatsappUrl
      }
    })
  } catch {
    // silencioso
  }
}
