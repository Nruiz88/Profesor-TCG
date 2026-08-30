import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { effectivePrice } from '@/lib/cardStatus'
import { validate, extractParams } from '@/lib/validate'
import { activitySchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// Actividad del binder del usuario logueado: las últimas cartas actualizadas
// (agregadas, puestas en venta/cambio o reservadas), derivadas de binder_cards.
// Como no hay auditoría de eventos, se infiere del estado actual de cada carta
// ordenada por updated_at desc.

export type OwnActivityKind = 'added' | 'for_sale' | 'for_trade' | 'reserved'

export interface OwnActivityItem {
  id: string
  card_name: string
  set_id: string
  number: string
  price: number | null
  kind: OwnActivityKind
  updated_at: string
}

interface Row {
  id: string
  card_name: string
  set_id: string
  number: string
  price: number | null
  price_override: number | null
  market_price: number | null
  manual_price: number | null
  is_for_sale: boolean | null
  is_for_trade: boolean | null
  status: string | null
  updated_at: string
}

export async function GET(req: Request) {
  const params = validate(activitySchema, extractParams(req))
  if (params.error) return params.error
  const limit = Math.min(params.data.limit, 60)

  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: binders } = await supabase
      .from('binders')
      .select('id')
      .eq('user_id', user.id)
    const ids = (binders || []).map((b) => b.id)
    if (ids.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const { data, error } = await supabase
      .from('binder_cards')
      .select(
        'id, card_name, set_id, number, price, price_override, market_price, manual_price, is_for_sale, is_for_trade, status, updated_at'
      )
      .in('binder_id', ids)
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const items: OwnActivityItem[] = ((data || []) as Row[]).map((r) => {
      let kind: OwnActivityKind
      if (r.status === 'reserved') kind = 'reserved'
      else if (r.is_for_sale) kind = 'for_sale'
      else if (r.is_for_trade) kind = 'for_trade'
      else kind = 'added'
      return {
        id: r.id,
        card_name: r.card_name,
        set_id: r.set_id,
        number: r.number,
        price: effectivePrice(r.market_price, r.price_override, r.price, r.manual_price),
        kind,
        updated_at: r.updated_at
      }
    })

    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}