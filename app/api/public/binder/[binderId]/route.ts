import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ binderId: string }> }) {
  const { binderId } = await params
  const supabase = await createClient()

  try {
    // RLS: solo devuelve el binder si is_public = true (para visitantes anónimos)
    const { data: binder } = await supabase
      .from('binders')
      .select('id, title')
      .eq('id', binderId)
      .eq('is_public', true)
      .maybeSingle()

    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado o privado' }, { status: 404 })
    }

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select('id, binder_id, card_id, card_name, set_id, number, slot_number, market_price')
      .eq('binder_id', binderId)
      .order('slot_number', { ascending: true })
    if (error) throw error

    return NextResponse.json({ binder, cards: cards || [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}