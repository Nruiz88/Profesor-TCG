import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCardImage } from '@/lib/cardImage'
import { normalizeLanguage } from '@/lib/cardLanguage'
import { effectivePrice } from '@/lib/cardStatus'
import {
  normalizeOfferStatus,
  type CardSnapshot,
  type OfferCardView,
  type OfferUserView,
  type TradeOfferRow,
  type TradeOfferView,
  type UserSnapshot
} from '@/lib/tradeOffers'
import { validate, extractParams } from '@/lib/validate'
import { offersSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

const CARD_FIELDS = 'id, card_name, set_id, number, market_price, price, price_override, manual_price, language'
const PROFILE_FIELDS = 'username, whatsapp_number, city, country'

function userView(s: UserSnapshot | null): OfferUserView {
  return {
    username: s?.username ?? 'coleccionista',
    whatsapp_number: s?.whatsapp_number ?? null,
    city: s?.city ?? null,
    country: s?.country ?? null
  }
}

function cardView(s: CardSnapshot, image: string): OfferCardView {
  return {
    id: s.id,
    card_name: s.card_name,
    set_id: s.set_id,
    number: s.number,
    image,
    price: effectivePrice(s.market_price, s.price_override, s.price, s.manual_price)
  }
}

// GET /api/offers?inbox=received|sent — bandeja de ofertas del usuario autenticado
export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const params = validate(offersSchema, extractParams(req))
    if (params.error) return params.error
    const { inbox } = params.data

    let query = supabase
      .from('trade_offers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (inbox === 'sent') {
      query = query.eq('sender_id', user.id)
    } else {
      query = query.eq('receiver_id', user.id)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as unknown as TradeOfferRow[]

    // Resolver imágenes (con caché) de todas las cartas involucradas
    const offers: TradeOfferView[] = await Promise.all(
      rows.map(async (r) => {
        const requestedSnap = r.requested_snapshot
        const offeredSnaps = r.offered_snapshot ?? []

        const requested: OfferCardView = requestedSnap
          ? cardView(requestedSnap, await resolveCardImage(requestedSnap.set_id, requestedSnap.number, normalizeLanguage(requestedSnap.language)))
          : {
              id: r.requested_card_id,
              card_name: 'Carta eliminada',
              set_id: '',
              number: '',
              image: '',
              price: null
            }

        const offered: OfferCardView[] = await Promise.all(
          offeredSnaps.map(async (s) => cardView(s, await resolveCardImage(s.set_id, s.number, normalizeLanguage(s.language))))
        )

        const totalRequested = requested.price ?? 0
        const totalOffered =
          offered.reduce((sum, o) => sum + (o.price ?? 0), 0) + (r.cash_offered ?? 0)

        return {
          id: r.id,
          status: normalizeOfferStatus(r.status),
          cash_offered: r.cash_offered ?? 0,
          message: r.message,
          created_at: r.created_at,
          requested,
          offered,
          totalRequested,
          totalOffered,
          sender: userView(r.sender_snapshot),
          receiver: userView(r.receiver_snapshot)
        }
      })
    )

    return NextResponse.json({ offers })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface CreateOfferBody {
  receiverId?: unknown
  requestedCardId?: unknown
  offeredCardIds?: unknown
  cashOffered?: unknown
  message?: unknown
}

// POST /api/offers — crear una propuesta de intercambio
export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: CreateOfferBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const receiverId = typeof body.receiverId === 'string' ? body.receiverId : ''
  const requestedCardId = typeof body.requestedCardId === 'string' ? body.requestedCardId : ''
  const offeredIds = Array.isArray(body.offeredCardIds)
    ? (body.offeredCardIds.filter((x): x is string => typeof x === 'string') as string[])
    : []
  const cashOffered = body.cashOffered == null || body.cashOffered === '' ? 0 : Number(body.cashOffered)
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''

  if (!receiverId || !requestedCardId) {
    return NextResponse.json({ error: 'Faltan datos de la oferta' }, { status: 400 })
  }
  if (offeredIds.length === 0) {
    return NextResponse.json({ error: 'Elegí al menos una carta para ofrecer' }, { status: 400 })
  }
  if (receiverId === user.id) {
    return NextResponse.json({ error: 'No podés ofrecerte a vos mismo' }, { status: 400 })
  }
  if (!Number.isFinite(cashOffered) || cashOffered < 0 || cashOffered > 999999) {
    return NextResponse.json({ error: 'Monto en efectivo inválido' }, { status: 400 })
  }

  try {
    // Perfil del receptor (visible porque su binder es público) y del sender
    const [receiverRes, senderRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', receiverId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('id', user.id)
        .maybeSingle()
    ])
    if (receiverRes.error) throw receiverRes.error
    if (!receiverRes.data) {
      return NextResponse.json({ error: 'El receptor no existe' }, { status: 404 })
    }

    // Carta solicitada: debe ser del receptor y estar disponible
    const { data: requested, error: reqError } = await supabase
      .from('binder_cards')
      .select(`${CARD_FIELDS}, binders!binder_cards_binder_id_fkey!inner(user_id)`)
      .eq('id', requestedCardId)
      .maybeSingle()
    if (reqError) throw reqError
    const requestedOwner =
      Array.isArray(requested?.binders)
        ? requested.binders[0]?.user_id
        : (requested?.binders as { user_id?: string } | undefined)?.user_id
    if (!requested || requestedOwner !== receiverId) {
      return NextResponse.json({ error: 'La carta solicitada no pertenece al receptor' }, { status: 400 })
    }

    // Cartas ofrecidas: deben ser del sender
    const { data: offeredRows, error: offError } = await supabase
      .from('binder_cards')
      .select(`${CARD_FIELDS}, binders!binder_cards_binder_id_fkey!inner(user_id)`)
      .in('id', offeredIds)
    if (offError) throw offError

    const offeredByMe = (offeredRows || []).filter((c) => {
      const owner = Array.isArray(c.binders)
        ? c.binders[0]?.user_id
        : (c.binders as { user_id?: string } | undefined)?.user_id
      return owner === user.id
    })
    if (offeredByMe.length !== offeredIds.length) {
      return NextResponse.json({ error: 'Una de las cartas ofrecidas no te pertenece' }, { status: 400 })
    }

    const toSnapshot = (c: {
      id: string
      card_name: string
      set_id: string
      number: string
      market_price: number | null
      price: number | null
      price_override: number | null
    }): CardSnapshot => ({
      id: c.id,
      card_name: c.card_name,
      set_id: c.set_id,
      number: c.number,
      market_price: c.market_price,
      price: c.price,
      price_override: c.price_override
    })

    const senderSnap: UserSnapshot = {
      username: senderRes.data?.username ?? 'coleccionista',
      whatsapp_number: senderRes.data?.whatsapp_number ?? null,
      city: senderRes.data?.city ?? null,
      country: senderRes.data?.country ?? null
    }
    const receiverSnap: UserSnapshot = {
      username: receiverRes.data.username,
      whatsapp_number: receiverRes.data.whatsapp_number ?? null,
      city: receiverRes.data.city ?? null,
      country: receiverRes.data.country ?? null
    }

    const { data: created, error: insertError } = await supabase
      .from('trade_offers')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        requested_card_id: requestedCardId,
        offered_card_ids: offeredIds,
        cash_offered: Math.round(cashOffered * 100) / 100,
        message: message === '' ? null : message,
        requested_snapshot: toSnapshot(requested),
        offered_snapshot: offeredByMe.map(toSnapshot),
        sender_snapshot: senderSnap,
        receiver_snapshot: receiverSnap,
        status: 'pending'
      })
      .select('id')
      .single()
    if (insertError) throw insertError

    return NextResponse.json({ offer: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
