import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { CLAIM_WINDOW_MS, revertExpiredReservations } from '@/lib/claim'
import { notifySellerOfClaim } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Soft Lock de 24h: el comprador que hace CLAIM sobre una carta pública
// (is_for_sale / is_for_trade) la marca como 'reserved' con vencimiento y se
// va a WhatsApp a coordinar.
//
// El claim abre WhatsApp para TODOS (logueado o no), pero la RESERVA solo se
// aplica con sesión: sin login se responde requiresLogin (sin tocar la carta)
// y el cliente muestra el mensaje de "iniciá sesión para reservar tu claim".
// Con sesión: soft lock 24h + registro en `claims` (reputación, confirmación
// y reseñas). Si hay una reserva activa sin transacciones (p. ej. una reserva
// anónima vieja), el claim del usuario logueado se "adjunta" en vez de 409.
//
// La actualización de la carta la hace el service role (RLS solo permite al
// dueño actualizar sus cartas, y acá lo hace un tercero); el registro del
// claim usa el cliente del usuario (RLS permite insert solo con
// auth.uid() = buyer_id).
export async function POST(req: Request) {
  let body: { card_id?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const cardId = typeof body.card_id === 'string' ? body.card_id.trim() : ''
  if (!cardId) {
    return NextResponse.json({ error: 'Falta card_id' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)
  const supabase = await createClient()

  try {
    // Primero revierte reservas vencidas (soft lock expirado vuelve a estar disponible)
    await revertExpiredReservations(admin)

    // Una carta en venta/cambio es pública por sí misma (aparece en el
    // marketplace) aunque su binder esté privado, así que el claim no exige
    // binder público: basta con que la carta esté listada.
    const { data: card, error: cardError } = await admin
      .from('binder_cards')
      .select('id, binder_id, status, is_for_sale, is_for_trade, reserved_until, card_name, set_id, number')
      .eq('id', cardId)
      .maybeSingle()
    if (cardError) throw cardError
    if (!card) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    if (!card.is_for_sale && !card.is_for_trade) {
      return NextResponse.json(
        { error: 'Esta carta no está disponible para claim' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Sin sesión: el claim NO reserva — se abre WhatsApp y se pide login.
    const {
      data: { user }
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: true, anonymous: true, requiresLogin: true })
    }

    const activeReservation =
      card.status === 'reserved' && card.reserved_until && new Date(card.reserved_until) > now
    if (activeReservation) {
      // Ya hay una reserva activa. Si la carta no tiene NINGUNA transacción
      // registrada (p. ej. una reserva anónima de antes de exigir login), el
      // claim del usuario logueado se adjunta: registra la transacción y
      // mantiene la reserva existente.
      {
        const { data: existing } = await admin
          .from('claims')
          .select('id')
          .eq('card_id', cardId)
          .maybeSingle()
        if (!existing) {
          const { data: binder } = await admin
            .from('binders')
            .select('user_id')
            .eq('id', card.binder_id)
            .maybeSingle()
          if (binder) {
            const kind =
              card.is_for_sale && card.is_for_trade ? 'both' : card.is_for_sale ? 'sale' : 'trade'
            const { data: claim, error: claimError } = await supabase
              .from('claims')
              .insert({
                buyer_id: user.id,
                seller_id: binder.user_id,
                card_id: cardId,
                kind,
                status: 'pending'
              })
              .select('id')
              .single()
            if (!claimError && claim) {
              return NextResponse.json({
                ok: true,
                reserved_until: card.reserved_until,
                expires_in_ms: new Date(card.reserved_until).getTime() - now.getTime(),
                claim_id: claim.id,
                attached: true
              })
            }
          }
        }
      }
      return NextResponse.json(
        { error: 'Esta carta ya está reservada por otro claim' },
        { status: 409 }
      )
    }

    // Con sesión: soft lock de 24h + registro de la transacción (reputación).
    const reservedUntil = new Date(now.getTime() + CLAIM_WINDOW_MS).toISOString()
    const { data, error } = await admin
      .from('binder_cards')
      .update({
        status: 'reserved',
        reserved_until: reservedUntil,
        updated_at: now.toISOString()
      })
      .eq('id', cardId)
      .select('id, status, reserved_until')
      .single()
    if (error) throw error

    const { data: binder } = await admin
      .from('binders')
      .select('user_id')
      .eq('id', card.binder_id)
      .maybeSingle()
    if (!binder) {
      await admin
        .from('binder_cards')
        .update({
          status: card.is_for_sale ? 'for_sale' : card.is_for_trade ? 'for_trade' : 'collection',
          reserved_until: null
        })
        .eq('id', cardId)
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 500 })
    }

    const kind = card.is_for_sale && card.is_for_trade ? 'both' : card.is_for_sale ? 'sale' : 'trade'
    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .insert({
        buyer_id: user.id,
        seller_id: binder.user_id,
        card_id: cardId,
        kind,
        status: 'pending'
      })
      .select('id')
      .single()
    if (claimError) {
      // Revertir la reserva para no dejar un soft lock sin transacción
      await admin
        .from('binder_cards')
        .update({
          status: card.is_for_sale ? 'for_sale' : card.is_for_trade ? 'for_trade' : 'collection',
          reserved_until: null
        })
        .eq('id', cardId)
      throw claimError
    }

    // Avisar al vendedor por notificación in-app (best-effort, no rompe el claim)
    try {
      const { data: buyerProfile } = await admin
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
      await notifySellerOfClaim({
        sellerId: binder.user_id,
        buyerUsername: buyerProfile?.username ?? 'coleccionista',
        binderCardId: cardId,
        cardName: card.card_name ?? 'una carta',
        setId: card.set_id ?? '',
        number: card.number ?? ''
      })
    } catch {
      // silencioso
    }

    return NextResponse.json({
      ok: true,
      reserved_until: data.reserved_until,
      expires_in_ms: CLAIM_WINDOW_MS,
      claim_id: claim.id,
      anonymous: false
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
