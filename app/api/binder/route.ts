import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const binderId = searchParams.get('binderId')

    let binder: { id: string; title: string; is_public: boolean } | null = null

    if (binderId) {
      const { data } = await supabase
        .from('binders')
        .select('id, title, is_public')
        .eq('id', binderId)
        .eq('user_id', user.id)
        .maybeSingle()
      binder = data ?? null
      if (!binder) {
        return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
      }
    } else {
      // Aseguramos el binder del usuario autenticado
      const { data: existing } = await supabase
        .from('binders')
        .select('id, title, is_public')
        .eq('user_id', user.id)
        .limit(1)
      let b = existing?.[0] ?? null

      if (!b) {
        const { data: created, error: createError } = await supabase
          .from('binders')
          .insert({ title: 'Mi Colección', user_id: user.id })
          .select('id, title, is_public')
          .single()
        if (createError) throw createError
        b = created
      }
      binder = b
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

export async function PATCH(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { binderId?: string; is_public?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.binderId) {
    return NextResponse.json({ error: 'Falta binderId' }, { status: 400 })
  }

  try {
    const { data: binder } = await supabase
      .from('binders')
      .select('id, title, is_public')
      .eq('id', body.binderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('binders')
      .update({ is_public: body.is_public ?? false })
      .eq('id', binder.id)
      .select('id, title, is_public')
      .single()
    if (error) throw error

    return NextResponse.json({ binder: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}