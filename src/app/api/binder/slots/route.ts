import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCardLanguage } from '@/lib/cardLanguage'
import { isCardCondition } from '@/lib/cardCondition'

export const dynamic = 'force-dynamic'

interface SlotInput {
  binder_id: string
  slot_number: number
  card_id: string
  card_name: string
  set_id: string
  number: string
  language?: string
  condition?: string | null
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
    // Verificamos que el binder pertenezca al usuario (RLS no permite lo contrario)
    const { data: binder } = await supabase
      .from('binders')
      .select('id')
      .eq('id', body.binder_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
    }

    // Idioma de la copia (opcional; por defecto Español)
    const language = body.language ?? 'ES'
    if (!isCardLanguage(language)) {
      return NextResponse.json({ error: 'Idioma inválido' }, { status: 400 })
    }

    // Estado físico (opcional): solo nomenclaturas estándar del TCG
    const condition =
      typeof body.condition === 'string' && body.condition.trim() !== ''
        ? body.condition.trim().slice(0, 40)
        : null
    if (condition !== null && !isCardCondition(condition)) {
      return NextResponse.json({ error: 'Condición inválida' }, { status: 400 })
    }

    // Precio desde la caché global card_prices si ya está cargada
    const { data: priceRow } = await supabase
      .from('card_prices')
      .select('market_price')
      .eq('card_id', body.card_id)
      .maybeSingle()
    const marketPrice = priceRow?.market_price ?? 0

    const { error } = await supabase.from('binder_cards').upsert(
      {
        binder_id: body.binder_id,
        slot_number: body.slot_number,
        card_id: body.card_id,
        card_name: body.card_name,
        set_id: body.set_id,
        number: body.number,
        language,
        condition,
        market_price: marketPrice,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'binder_id,slot_number' }
    )
    if (error) throw error

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}