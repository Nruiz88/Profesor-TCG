import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

// Transacciones del usuario logueado (como comprador o vendedor), con el
// username de la contraparte, info de la carta y si ya la calificó.
// La reputación es pública, así que los joins se hacen con service role.
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

    // Contrapartes y cartas (datos públicos vía service role)
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
        .select('id, username')
        .in('id', [...userIds]),
      admin
        .from('binder_cards')
        .select('id, card_name, set_id, number')
        .in('id', [...cardIds]),
      supabase
        .from('reviews')
        .select('claim_id')
        .eq('reviewer_id', user.id)
    ])

    const usernameById = new Map((profiles || []).map((p) => [p.id, p.username]))
    const cardById = new Map((cards || []).map((c) => [c.id, c]))
    const reviewedClaimIds = new Set((myReviews || []).map((r) => r.claim_id))

    const rows = claims.map((c) => {
      const isBuyer = c.buyer_id === user.id
      const otherId = isBuyer ? c.seller_id : c.buyer_id
      const card = c.card_id ? cardById.get(c.card_id) : null
      return {
        id: c.id,
        status: c.status,
        kind: c.kind,
        role: isBuyer ? 'buyer' : 'seller',
        counterpart: {
          id: otherId,
          username: usernameById.get(otherId) ?? 'coleccionista'
        },
        card: card
          ? {
              card_name: card.card_name,
              set_id: card.set_id,
              number: card.number
            }
          : null,
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
