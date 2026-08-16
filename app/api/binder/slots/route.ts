import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface SlotInput {
  binder_id: string
  slot_number: number
  card_id: string
  card_name: string
  set_id: string
  number: string
}

export async function POST(req: Request) {
  const supabase = getSupabase()

  let body: SlotInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (
    !body.binder_id ||
    typeof body.slot_number !== 'number' ||
    body.slot_number < 1 ||
    !body.card_id ||
    !body.card_name ||
    !body.set_id ||
    !body.number
  ) {
    return NextResponse.json({ error: 'Datos de slot inválidos' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('binder_cards').upsert(
      {
        binder_id: body.binder_id,
        slot_number: body.slot_number,
        card_id: body.card_id,
        card_name: body.card_name,
        set_id: body.set_id,
        number: body.number,
        market_price: 0,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'binder_id,slot_number' }
    )
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}