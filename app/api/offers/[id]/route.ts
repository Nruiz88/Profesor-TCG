import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isTradeOfferStatus } from '@/lib/tradeOffers'

export const dynamic = 'force-dynamic'

// Al aceptar, marca las cartas involucradas como reservadas. Usa el cliente
// con service role porque cada parte solo puede actualizar sus propias cartas
// por RLS, y acá hay que reservar las del otro lado también.
async function reserveCards(offer: {
  requested_card_id: string
  offered_card_ids: string[]
}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return

  const admin = createAdminClient(url, serviceKey)
  const ids = [offer.requested_card_id, ...(offer.offered_card_ids || [])]
  if (ids.length === 0) return

  await admin
    .from('binder_cards')
    .update({ status: 'reserved', updated_at: new Date().toISOString() })
    .in('id', ids)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { status?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!isTradeOfferStatus(body.status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  const next = body.status

  try {
    const { data: offer } = await supabase
      .from('trade_offers')
      .select('id, sender_id, receiver_id, requested_card_id, offered_card_ids, status')
      .eq('id', id)
      .maybeSingle()
    if (!offer) {
      return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 })
    }

    const isSender = offer.sender_id === user.id
    const isReceiver = offer.receiver_id === user.id
    if (!isSender && !isReceiver) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Reglas por rol: el sender solo puede cancelar; el receptor aceptar/rechazar
    if (isSender && next !== 'cancelled') {
      return NextResponse.json({ error: 'Solo podés cancelar tus ofertas' }, { status: 403 })
    }
    if (isReceiver && next !== 'accepted' && next !== 'rejected') {
      return NextResponse.json({ error: 'Solo podés aceptar o rechazar' }, { status: 403 })
    }
    // No se puede cambiar una oferta que ya se resolvió
    if (offer.status !== 'pending' && next !== offer.status) {
      return NextResponse.json({ error: 'La oferta ya fue respondida' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('trade_offers')
      .update({ status: next })
      .eq('id', id)
      .select('id, status')
      .single()
    if (error) throw error

    // Al aceptar: reservar las cartas involucradas (las de ambos lados)
    if (next === 'accepted') {
      await reserveCards(offer)
    }

    return NextResponse.json({ offer: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
