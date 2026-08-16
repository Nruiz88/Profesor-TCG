import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { CLAIM_WINDOW_MS, revertExpiredReservations } from '@/lib/claim'

export const dynamic = 'force-dynamic'

// Soft Lock de 24h: el comprador que hace CLAIM sobre una carta pública
// (is_for_sale / is_for_trade) la marca como 'reserved' con vencimiento.
// El claim es anónimo (el comprador llega por un link compartido), así que
// se aplica con el cliente de service role: RLS solo permite al dueño
// actualizar sus cartas, y acá lo hace un tercero.
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

  try {
    // Primero revierte reservas vencidas (soft lock expirado vuelve a estar disponible)
    await revertExpiredReservations(admin)

    // Una carta en venta/cambio es pública por sí misma (aparece en el
    // marketplace) aunque su binder esté privado, así que el claim no exige
    // binder público: basta con que la carta esté listada.
    const { data: card, error: cardError } = await admin
      .from('binder_cards')
      .select('id, binder_id, status, is_for_sale, is_for_trade, reserved_until')
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
    const activeReservation = card.status === 'reserved' && card.reserved_until && new Date(card.reserved_until) > now
    if (activeReservation) {
      return NextResponse.json(
        { error: 'Esta carta ya está reservada por otro claim' },
        { status: 409 }
      )
    }

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

    return NextResponse.json({
      ok: true,
      reserved_until: data.reserved_until,
      expires_in_ms: CLAIM_WINDOW_MS
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
