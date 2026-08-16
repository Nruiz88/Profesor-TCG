import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()

  try {
    const { data: pages, error } = await supabase
      .from('binder_pages')
      .select('id, name, position')
      .order('position', { ascending: true })
    if (error) throw error

    const pageIds = pages.map((p) => p.id)

    let slots: any[] = []
    if (pageIds.length > 0) {
      const { data, error: slotError } = await supabase
        .from('binder_slots')
        .select('id, page_id, slot, card_id, card_name, card_set_id, card_set_name, card_number, card_rarity, card_image')
        .in('page_id', pageIds)
      if (slotError) throw slotError
      slots = data || []
    }

    const cardIds = slots.map((s) => s.card_id)

    let prices: Record<string, number | null> = {}
    if (cardIds.length > 0) {
      const { data, error: priceError } = await supabase
        .from('card_prices')
        .select('card_id, market_price')
        .in('card_id', cardIds)
      if (priceError) throw priceError
      prices = Object.fromEntries((data || []).map((p) => [p.card_id, p.market_price]))
    }

    const pagesWithSlots = pages.map((page) => ({
      ...page,
      slots: slots
        .filter((s) => s.page_id === page.id)
        .map((s) => ({ ...s, market_price: prices[s.card_id] ?? null }))
    }))

    return NextResponse.json({ pages: pagesWithSlots })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}