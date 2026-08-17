'use server'

import { headers } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  generateWhatsAppUrl,
  normalizeWhatsAppLanguage
} from '@/lib/whatsapp'

// ============================================================================
// createClaimAction — registra el intento de transacción (Claim) de forma
// segura:
//   1. Autenticación de servidor con el cliente SSR de Supabase.
//   2. Validación de UUIDs (carta y vendedor) y de precio (número positivo).
//   3. Integridad: la carta debe existir, estar listada y pertenecer al
//      vendedor indicado; nunca se puede reclamar una carta propia.
//   4. Inserta el registro en `claims` con estado 'pending' (RLS permite el
//      insert solo si auth.uid() = buyer_id, que es el usuario logueado).
//   5. Genera el deep link de WhatsApp con datos reales del vendedor
//      (desacoplado en lib/whatsapp.ts), no con datos del cliente.
// ============================================================================

export interface CreateClaimInput {
  /** UUID de la carta (binder_cards). */
  cardId: string
  /** UUID del vendedor (profiles). */
  sellerId: string
  /** Tipo de transacción: compra (claim) o intercambio (swap). */
  type: 'claim' | 'swap'
  /** Precio pactado (debe ser un número positivo). */
  price: number
  /** Moneda del precio (USD/EUR/ARS). */
  currency?: string
  /** Idioma de la copia (si no se pasa, se usa el de la carta). */
  language?: string
  /** Condición física de la carta (si no se pasa, se usa el de la carta). */
  condition?: string
  /** Carta que ofrece el comprador (solo swaps). */
  offeredCardName?: string
  /** URL pública del slot (si no se pasa, se genera una servidor). */
  slotUrl?: string
}

export type CreateClaimResult =
  | { success: true; claimId: string; whatsappUrl: string }
  | { success: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function createClaimAction(
  input: CreateClaimInput
): Promise<CreateClaimResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autorizado' }

  const cardId = typeof input.cardId === 'string' ? input.cardId.trim() : ''
  const sellerId = typeof input.sellerId === 'string' ? input.sellerId.trim() : ''
  const price = Number(input.price)

  if (!UUID_RE.test(cardId)) {
    return { success: false, error: 'Identificador de carta inválido' }
  }
  if (!UUID_RE.test(sellerId)) {
    return { success: false, error: 'Identificador de vendedor inválido' }
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'El precio debe ser un número positivo' }
  }

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) {
      return { success: false, error: 'Servicio no disponible' }
    }
    const admin = createAdminClient(url, serviceKey)

    // La carta debe existir, estar listada para claim y pertenecer al vendedor.
    const { data: card, error: cardError } = await admin
      .from('binder_cards')
      .select(
        'id, binder_id, card_name, set_id, number, condition, language, currency, is_for_sale, is_for_trade'
      )
      .eq('id', cardId)
      .maybeSingle()
    if (cardError) throw cardError
    if (!card) return { success: false, error: 'Carta no encontrada' }
    if (!card.is_for_sale && !card.is_for_trade) {
      return { success: false, error: 'La carta no está disponible para claim' }
    }

    const { data: binder, error: binderError } = await admin
      .from('binders')
      .select('user_id')
      .eq('id', card.binder_id)
      .maybeSingle()
    if (binderError) throw binderError

    const ownerId: string | null = binder?.user_id ?? null
    if (!ownerId || ownerId !== sellerId) {
      return { success: false, error: 'El vendedor no es el dueño de la carta' }
    }
    if (ownerId === user.id) {
      return { success: false, error: 'No podés reclamar tu propia carta' }
    }

    const { data: seller, error: sellerError } = await admin
      .from('profiles')
      .select('username, whatsapp_number')
      .eq('id', sellerId)
      .maybeSingle()
    if (sellerError) throw sellerError
    if (!seller) return { success: false, error: 'Vendedor no encontrado' }

    const kind = input.type === 'swap' ? 'trade' : 'sale'

    const { data: claim, error: insertError } = await supabase
      .from('claims')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        card_id: cardId,
        kind,
        status: 'pending'
      })
      .select('id')
      .single()
    if (insertError) throw insertError

    // URL pública del slot, generada en servidor para que no dependa de un
    // valor arbitrario del cliente.
    const headerStore = await headers()
    const proto = headerStore.get('x-forwarded-proto') ?? 'https'
    const host = headerStore.get('host') ?? ''
    const origin = host ? `${proto}://${host}` : ''
    const slotUrl =
      origin && seller.username
        ? `${origin}/binder/${encodeURIComponent(seller.username)}?card=${cardId}`
        : typeof input.slotUrl === 'string'
          ? input.slotUrl
          : ''

    const whatsappUrl = generateWhatsAppUrl({
      sellerPhone: seller.whatsapp_number ?? '',
      sellerUsername: seller.username ?? '',
      cardName: card.card_name,
      setName: card.set_id,
      cardNumber: card.number,
      language: normalizeWhatsAppLanguage(input.language ?? card.language),
      condition: input.condition ?? card.condition ?? undefined,
      type: input.type,
      price,
      currency: input.currency ?? card.currency ?? undefined,
      offeredCardName: input.offeredCardName,
      slotUrl
    })

    return { success: true, claimId: claim.id, whatsappUrl }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}