import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { effectivePrice } from '@/lib/cardStatus'
import { validate, extractParams } from '@/lib/validate'
import { activitySchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export type ActivityStatus = 'for_sale' | 'for_trade' | 'reserved'

export interface ActivityItem {
  id: string
  card_name: string
  set_id: string
  number: string
  price: number | null
  status: ActivityStatus
  username: string
  city: string | null
  country: string | null
  updated_at: string
}

interface ActivityRow {
  id: string
  card_name: string
  set_id: string
  number: string
  price: number | null
  price_override: number | null
  market_price: number | null
  is_for_sale: boolean | null
  is_for_trade: boolean | null
  status: string | null
  updated_at: string
  binders: { user_id: string } | { user_id: string }[] | null
}

// Última actividad del marketplace (nuevas publicaciones en venta/cambio y
// reservas recientes), para el ticker animado de la home. Público: solo ve
// binders públicos vía RLS.
export async function GET(req: Request) {
  const params = validate(activitySchema, extractParams(req))
  if (params.error) return params.error
  const limit = Math.min(params.data.limit, 60)

  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('binder_cards')
      .select(
        `id, card_name, set_id, number, price, price_override, market_price,
         is_for_sale, is_for_trade, status, updated_at,
         binders!binder_cards_binder_id_fkey!inner ( user_id )`
      )
      .or('is_for_sale.eq.true,is_for_trade.eq.true,status.eq.reserved')
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const rows = (data || []) as unknown as ActivityRow[]

    // Perfiles de los vendedores (username, ciudad)
    const userIds = [
      ...new Set(
        rows
          .map((r) => (Array.isArray(r.binders) ? r.binders[0] : r.binders)?.user_id)
          .filter(Boolean) as string[]
      )
    ]
    let profiles: { id: string; username: string; city: string | null; country: string | null }[] =
      []
    if (userIds.length > 0) {
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select('id, username, city, country')
        .in('id', userIds)
      if (pError) throw pError
      profiles = (pData || []) as typeof profiles
    }
    const profileById = new Map(profiles.map((p) => [p.id, p]))

    const items: ActivityItem[] = rows.map((r) => {
      const binder = Array.isArray(r.binders) ? r.binders[0] : r.binders
      const profile = binder?.user_id ? profileById.get(binder.user_id) : undefined
      const status: ActivityStatus = r.is_for_sale
        ? 'for_sale'
        : r.is_for_trade
          ? 'for_trade'
          : 'reserved'
      return {
        id: r.id,
        card_name: r.card_name,
        set_id: r.set_id,
        number: r.number,
        price: effectivePrice(r.market_price, r.price_override, r.price),
        status,
        username: profile?.username ?? 'coleccionista',
        city: profile?.city ?? null,
        country: profile?.country ?? null,
        updated_at: r.updated_at
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
