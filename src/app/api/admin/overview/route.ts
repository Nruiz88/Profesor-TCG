import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { effectivePrice } from '@/lib/cardStatus'

export const dynamic = 'force-dynamic'

// Panel admin: estadísticas globales de usuarios, cartas, binders,
// ofertas y actividad reciente. Solo accesible para perfiles con
// is_admin = true (el flag no puede auto-otorgarse por RLS).
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
    const [usersRes, bindersRes, cardsRes, offersRes, marketRes] = await Promise.all([
      admin
        .from('profiles')
        .select('id, username, city, country, created_at, is_admin, is_verified')
        .order('created_at', { ascending: false })
        .limit(500),
      admin.from('binders').select('id, user_id, is_public').limit(5000),
      admin
        .from('binder_cards')
        .select('binder_id, status, is_for_sale, is_for_trade, price, price_override, market_price')
        .limit(20000),
      admin.from('trade_offers').select('status').limit(5000),
      admin
        .from('binder_cards')
        .select(
          'price, price_override, market_price, manual_price, binders!binder_cards_binder_id_fkey!inner(user_id)'
        )
        .or('is_for_sale.eq.true,is_for_trade.eq.true')
        .eq('binders.is_public', true)
        .limit(1000)
    ])

    const users = usersRes.data || []
    const binders = bindersRes.data || []
    const cards = cardsRes.data || []
    const offers = offersRes.data || []
    const marketRows = (marketRes.data || []) as unknown as Array<{
      price: number | null
      price_override: number | null
      market_price: number | null
      manual_price: number | null
      binders: { user_id: string } | { user_id: string }[] | null
    }>

    // Conteo de cartas por binder y por usuario
    const cardsByBinder = new Map<string, { total: number; sale: number; trade: number }>()
    let forSale = 0
    let forTrade = 0
    let reserved = 0
    for (const c of cards) {
      const b = cardsByBinder.get(c.binder_id) || { total: 0, sale: 0, trade: 0 }
      b.total++
      if (c.is_for_sale) b.sale++
      if (c.is_for_trade) b.trade++
      if (c.status === 'reserved') reserved++
      if (c.is_for_sale) forSale++
      if (c.is_for_trade) forTrade++
      cardsByBinder.set(c.binder_id, b)
    }

    const binderByUser = new Map<string, { count: number; publicCount: number }>()
    for (const b of binders) {
      const u = binderByUser.get(b.user_id) || { count: 0, publicCount: 0 }
      u.count++
      if (b.is_public) u.publicCount++
      binderByUser.set(b.user_id, u)
    }

    // Agregados por usuario (mapa directo binder -> dueño -> cartas)
    const binderOwner = new Map(binders.map((b) => [b.id, b.user_id]))
    const perUser = new Map<string, { cardCount: number; saleCount: number; tradeCount: number }>()
    for (const [binderId, c] of cardsByBinder) {
      const uid = binderOwner.get(binderId)
      if (!uid) continue
      const acc = perUser.get(uid) || { cardCount: 0, saleCount: 0, tradeCount: 0 }
      acc.cardCount += c.total
      acc.saleCount += c.sale
      acc.tradeCount += c.trade
      perUser.set(uid, acc)
    }

    // Usuarios enriquecidos con sus conteos
    const userRows = users.map((u) => {
      const bStats = binderByUser.get(u.id)
      const acc = perUser.get(u.id) || { cardCount: 0, saleCount: 0, tradeCount: 0 }
      return {
        id: u.id,
        username: u.username,
        city: u.city,
        country: u.country,
        created_at: u.created_at,
        is_admin: u.is_admin,
        is_verified: !!u.is_verified,
        binderCount: bStats?.count || 0,
        hasPublicBinder: (bStats?.publicCount || 0) > 0,
        cardCount: acc.cardCount,
        saleCount: acc.saleCount,
        tradeCount: acc.tradeCount
      }
    })

    // Valor del mercado (listados públicos activos)
    let marketValue = 0
    for (const r of marketRows) {
      const p = effectivePrice(r.market_price, r.price_override, r.price, r.manual_price)
      if (p != null) marketValue += p
    }

    // Ofertas por estado
    const offerCounts = { total: offers.length, pending: 0, accepted: 0, rejected: 0, cancelled: 0 }
    for (const o of offers) {
      if (o.status in offerCounts) offerCounts[o.status as keyof typeof offerCounts]++
    }

    // Actividad por día: cartas agregadas en los últimos 14 días (para el
    // gráfico del panel). Se agrupa en JS para no depender de una vista/RPC.
    const dayCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
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

    const userName = new Map(users.map((u) => [u.id, u.username]))
    const recent = (recentCards || []).map((c) => ({
      card_name: c.card_name,
      set_id: c.set_id,
      number: c.number,
      status: c.status,
      is_for_sale: c.is_for_sale,
      is_for_trade: c.is_for_trade,
      price: effectivePrice(c.market_price, c.price_override, c.price, c.manual_price),
      updated_at: c.updated_at,
      username: userName.get(binderOwner.get(c.binder_id) || '') || '—'
    }))

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: { total: userRows.length, rows: userRows },
      cards: {
        total: cards.length,
        forSale,
        forTrade,
        reserved,
        collection: cards.length - forSale - forTrade - reserved
      },
      binders: { total: binders.length, public: binders.filter((b) => b.is_public).length },
      offers: offerCounts,
      marketValue,
      recent,
      activity
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
