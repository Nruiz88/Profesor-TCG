import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { max_budget?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  let maxBudget: number | null = null
  if (body.max_budget !== undefined && body.max_budget !== null && body.max_budget !== '') {
    const parsed = Number(body.max_budget)
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: 'Presupuesto inválido' }, { status: 400 })
    }
    maxBudget = Math.round(parsed * 100) / 100
  }

  try {
    const { data, error } = await supabase
      .from('wantlist_cards')
      .update({ max_budget: maxBudget })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, max_budget')
      .single()
    if (error) throw error

    return NextResponse.json({ wantlist: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('wantlist_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}