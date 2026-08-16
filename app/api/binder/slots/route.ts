import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface SlotInput {
  page_id: string
  slot: number
  card_id: string
  card_name: string
  card_set_id: string
  card_set_name: string
  card_number: string
  card_rarity: string | null
  card_image: string
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
    !body.page_id ||
    typeof body.slot !== 'number' ||
    body.slot < 0 ||
    body.slot > 8 ||
    !body.card_id ||
    !body.card_name
  ) {
    return NextResponse.json({ error: 'Datos de slot inválidos' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('binder_slots').insert({
      page_id: body.page_id,
      slot: body.slot,
      card_id: body.card_id,
      card_name: body.card_name,
      card_set_id: body.card_set_id,
      card_set_name: body.card_set_name,
      card_number: body.card_number,
      card_rarity: body.card_rarity || null,
      card_image: body.card_image
    })
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}