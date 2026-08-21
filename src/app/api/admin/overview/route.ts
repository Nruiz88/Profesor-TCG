import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/cardStatus'

export const dynamic = 'force-dynamic'

// Panel admin: estadísticas globales de usuarios, cartas, binders, ofertas y
// actividad reciente. Solo accesible para perfiles con is_admin = true.
// Los totales se calculan con conteos exactos (head count) para que los KPIs
// sean precisos sin importar el volumen; la tabla de usuarios se sirve paginada
// desde /api/admin/users.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar rol admin (la RLS permite leer el propio perfil)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'No tenés permisos de administrador' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    const dayCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [
      usersTotal,
      usersNew14d,
      usersVerified,
      cardsTotal,
      cardsForSale,
      cardsForTrade,
      cardsReserved,
      bindersTotal,
      bindersPublic,
      offersTotal,
      offersPending,
      offersAccepted,
      offersRejected,
      offersCancelled,
      marketRes
    ] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', dayCutoff),
      admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_verified', true),
      admin.from('binder_cards').select('id', { count: 'exact', head: true }),
      admin.from('binder_cards').select('id', { count: 'exact', head: true }).eq('is_for_sale', true),
      admin.from('binder_cards').select('id', { count: 'exact', head: true }).eq('is_for_trade', true),
      admin.from('binder_cards').select('id', { count: 'exact', head: true }).eq('status', 'reserved'),
      admin.from('binders').select('id', { count: 'exact', head: true }),
      admin.from('binders').select('id', { count: 'exact', head: true }).eq('is_public', true),
      admin.from('trade_offers').select('id', { count: 'exact', head: true }),
      admin.from('trade_offers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('trade_offers').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
      admin.from('trade_offers').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      admin.from('trade_offers').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      admin
        .from('binder_cards')
        .select(
          'price, price_override, market_price, manual_price, binders!binder_cards_binder_id_fkey!inner(user_id)'
        )
        .or('is_for_sale.eq.true,is_for_trade.eq.true')
        .eq('binders.is_public', true)
        .limit(1000)
    ])

    // Valor del mercado (listados públicos activos)
    let marketValue = 0
    for (const r of (marketRes.data || []) as Array<{
      price: number | null
      price_override: number | null
      market_price: number | null
      manual_price: number | null
    }>) {
      const p = effectivePrice(r.market_price, r.price_override, r.price, r.manual_price)
      if (p != null) marketValue += p
    }

    // Actividad por día: cartas agregadas en los últimos 14 días (para el
    // gráfico del panel). Se agrupa en JS para no depender de una vista/RPC.
    const { data: activityRows } = await admin
      .from('binder_cards')
      .select('created_at')
      .gte('created_at', dayCutoff)

    const countByDay = new Map<string, number>()
    for (const r of activityRows || []) {
      const day = r.created_at ? String(r.created_at).slice(0, 10) : ''
      if (day) countByDay.set(day, (countByDay.get(day) || 0) + 1)
    }
    const activity: Array<{ date: string; count: number }> = []
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      activity.push({ date: day, count: countByDay.get(day) || 0 })
    }

    // Actividad reciente (últimas 15 cartas tocadas) con username del dueño
    const { data: recentCards } = await admin
      .from('binder_cards')
      .select(
        'card_name, set_id, number, status, is_for_sale, is_for_trade, price, price_override, market_price, manual_price, updated_at, binder_id'
      )
      .order('updated_at', { ascending: false })
      .limit(15)

    let recent: Array<{
      card_name: string
      set_id: string
      number: string
      status: string
      is_for_sale: boolean
      is_for_trade: boolean
      price: number | null
      updated_at: string
      username: string
    }> = []
    if (recentCards && recentCards.length > 0) {
      const binderIds = [...new Set(recentCards.map((c) => c.binder_id))]
      const { data: recentBinders } = await admin
        .from('binders')
        .select('id, user_id')
        .in('id', binderIds)
      const ownerByBinder = new Map((recentBinders || []).map((b) => [b.id, b.user_id]))
      const ownerIds = [...new Set(ownerByBinder.values())]
      let nameById = new Map<string, string>()
      if (ownerIds.length > 0) {
        const { data: recentUsers } = await admin
          .from('profiles')
          .select('id, username')
          .in('id', ownerIds)
        nameById = new Map((recentUsers || []).map((u) => [u.id, u.username]))
      }
      recent = recentCards.map((c) => ({
        card_name: c.card_name,
        set_id: c.set_id,
        number: c.number,
        status: c.status,
        is_for_sale: c.is_for_sale,
        is_for_trade: c.is_for_trade,
        price: effectivePrice(c.market_price, c.price_override, c.price, c.manual_price),
        updated_at: c.updated_at,
        username: nameById.get(ownerByBinder.get(c.binder_id) || '') || '—'
      }))
    }

    const totalCards = cardsTotal.count ?? 0
    const forSale = cardsForSale.count ?? 0
    const forTrade = cardsForTrade.count ?? 0
    const reserved = cardsReserved.count ?? 0
    const totalOffers = offersTotal.count ?? 0

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: usersTotal.count ?? 0,
        new14d: usersNew14d.count ?? 0,
        verified: usersVerified.count ?? 0,
        rows: []
      },
      cards: {
        total: totalCards,
        forSale,
        forTrade,
        reserved,
        collection: Math.max(0, totalCards - forSale - forTrade - reserved)
      },
      binders: { total: bindersTotal.count ?? 0, public: bindersPublic.count ?? 0 },
      offers: {
        total: totalOffers,
        pending: offersPending.count ?? 0,
        accepted: offersAccepted.count ?? 0,
        rejected: offersRejected.count ?? 0,
        cancelled: offersCancelled.count ?? 0
      },
      marketValue,
      recent,
      activity
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}