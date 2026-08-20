import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { effectivePrice } from '@/lib/cardStatus'
import { normalizeLanguage } from '@/lib/cardLanguage'

export const dynamic = 'force-dynamic'

interface ClaimRow {
  id: string
  buyer_id: string
  seller_id: string
  card_id: string | null
  kind: string
  status: string
  created_at: string
  completed_at: string | null
}

interface RawCard {
  id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  market_price: number | null
  price_override: number | null
  price: number | null
  manual_price: number | null
  currency: string | null
  language: string | null
  condition: string | null
  variant: string | null
  is_user_reported: boolean | null
}

// Transacciones del usuario logueado (como comprador o vendedor), con la
// contraparte (username + whatsapp), la carta completa (imagen, rareza, tipos,
// idioma, condición, precio) y si ya la calificó. Los joins se hacen con
// service role porque la reputación y los datos de la carta son públicos.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const claims = (data || []) as ClaimRow[]

    const userIds = new Set<string>()
    const cardIds = new Set<string>()
    for (const c of claims) {
      userIds.add(c.buyer_id)
      userIds.add(c.seller_id)
      if (c.card_id) cardIds.add(c.card_id)
    }

    const [{ data: profiles }, { data: cards }, { data: myReviews }] = await Promise.all([
      admin
        .from('profiles')
        .select('id, username, whatsapp_number')
        .in('id', [...userIds]),
      admin
        .from('binder_cards')
        .select(
          'id, card_id, card_name, set_id, number, market_price, price_override, price, manual_price, currency, language, condition, variant, is_user_reported'
        )
        .in('id', [...cardIds]),
      supabase
        .from('reviews')
        .select('claim_id')
        .eq('reviewer_id', user.id)
    ])

    const profileById = new Map((profiles || []).map((p) => [p.id, p]))
    const cardById = new Map((cards || []).map((c) => [c.id, c]))
    const reviewedClaimIds = new Set((myReviews || []).map((r) => r.claim_id))

    // Metadata del catálogo (rareza, tipos, supertype, subtypes) + imagen
    const meta = await getCardMetadataMap()
    const enrichedCards = new Map<string, unknown>()
    for (const card of cardById.values() as unknown as RawCard[]) {
      const m = meta.get(card.card_id)
      enrichedCards.set(card.id, {
        card_name: card.card_name,
        set_id: card.set_id,
        number: card.number,
        rarity: m?.rarity ?? null,
        supertype: m?.supertype ?? null,
        subtypes: m?.subtypes ?? null,
        types: m?.types ?? null,
        language: card.language ?? null,
        condition: card.condition ?? null,
        variant: card.variant ?? 'normal',
        currency: card.currency ?? 'USD',
        price: effectivePrice(card.market_price, card.price_override, card.price, card.manual_price),
        image: await resolveCardImage(card.set_id, card.number, normalizeLanguage(card.language))
      })
    }

    const rows = claims.map((c) => {
      const isBuyer = c.buyer_id === user.id
      const otherId = isBuyer ? c.seller_id : c.buyer_id
      const profile = profileById.get(otherId)
      const card = c.card_id ? enrichedCards.get(c.card_id) ?? null : null
      return {
        id: c.id,
        status: c.status,
        kind: c.kind,
        role: isBuyer ? 'buyer' : 'seller',
        counterpart: {
          id: otherId,
          username: profile?.username ?? 'coleccionista',
          whatsapp_number: profile?.whatsapp_number ?? null
        },
        card,
        created_at: c.created_at,
        completed_at: c.completed_at,
        reviewedByMe: reviewedClaimIds.has(c.id)
      }
    })

    return NextResponse.json({ claims: rows })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
