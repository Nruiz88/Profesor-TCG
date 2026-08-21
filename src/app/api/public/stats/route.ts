import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap } from '@/lib/catalog'
import { effectivePrice } from '@/lib/cardStatus'

export const dynamic = 'force-dynamic'

// Métricas públicas para la home (barra de prueba social):
// - catalogCards: tamaño del catálogo indexado (17.000+ cartas).
// - marketValue:  suma del precio efectivo de las cartas activas del marketplace.
// - sellers:      cantidad de coleccionistas con publicaciones en venta/cambio.
// - users:        cantidad real de usuarios registrados (vía service role, la RLS
//                 impide contar perfiles ajenos con el cliente autenticado).
export async function GET() {
  try {
    const supabase = await createClient()
    const [catalog, cardsResult] = await Promise.all([
      getCardMetadataMap(),
      supabase
        .from('binder_cards')
        .select(
          'price, price_override, market_price, manual_price, binders!binder_cards_binder_id_fkey!inner(user_id)'
        )
        .or('is_for_sale.eq.true,is_for_trade.eq.true')
        .eq('binders.is_public', true)
        .limit(1000)
    ])

    // Conteo real de usuarios registrados (mejor esfuerzo: si falta la service
    // role key, devolvemos null y la barra muestra los vendedores como fallback).
    let users: number | null = null
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (serviceKey && url) {
      const admin = createAdminClient(url, serviceKey)
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
      users = count ?? null
    }
    if (cardsResult.error) throw cardsResult.error

    const rows = (cardsResult.data || []) as unknown as Array<{
      price: number | null
      price_override: number | null
      market_price: number | null
      manual_price: number | null
      binders: { user_id: string } | { user_id: string }[] | null
    }>

    let marketValue = 0
    const sellers = new Set<string>()
    for (const r of rows) {
      const p = effectivePrice(r.market_price, r.price_override, r.price, r.manual_price)
      if (p != null) marketValue += p
      const b = Array.isArray(r.binders) ? r.binders[0] : r.binders
      if (b?.user_id) sellers.add(b.user_id)
    }

    // Conteo exacto de ofertas activas (cartas en venta/cambio de binders
    // públicos). Mejor esfuerzo: si el conteo falla, usamos el total de la
    // query limitada como aproximación.
    let activeListings = rows.length
    try {
      const { count } = await supabase
        .from('binder_cards')
        .select('id', { count: 'exact', head: true })
        .or('is_for_sale.eq.true,is_for_trade.eq.true')
        .eq('binders.is_public', true)
      if (count != null) activeListings = count
    } catch {
      // fallback al conteo limitado
    }

    return NextResponse.json(
      {
        catalogCards: catalog.size,
        marketValue,
        sellers: sellers.size,
        users,
        activeListings
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
        }
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
