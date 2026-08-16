import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = getSupabase()

  try {
    // Aseguramos un binder por defecto (demo sin auth)
    const { data: existing } = await supabase.from('binders').select('id, title').limit(1)
    let binder = existing?.[0] ?? null

    if (!binder) {
      const { data: created, error: createError } = await supabase
        .from('binders')
        .insert({ title: 'Mi Colección' })
        .select('id, title')
        .single()
      if (createError) throw createError
      binder = created
    }

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select('id, binder_id, card_id, card_name, set_id, number, slot_number, market_price')
      .eq('binder_id', binder.id)
      .order('slot_number', { ascending: true })
    if (error) throw error

    return NextResponse.json({
      binder,
      cards: cards || []
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}