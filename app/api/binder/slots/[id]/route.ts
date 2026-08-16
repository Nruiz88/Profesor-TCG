import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isCardStatus } from '@/lib/cardStatus'

export const dynamic = 'force-dynamic'

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
    // RLS: solo permite borrar la fila si el binder pertenece al usuario
    const { error } = await supabase.from('binder_cards').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface PatchBody {
  status?: unknown
  price_override?: unknown
}

// Actualizar el estado (status) y/o el precio manual (price_override) de una carta
// del binder propio. RLS impide tocar cartas de otros usuarios.
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

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const updates: Record<string, string | number | null> = {}

  if (body.status !== undefined) {
    if (!isCardStatus(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body.price_override !== undefined) {
    const v = body.price_override
    if (v === null || v === '') {
      updates.price_override = null
    } else {
      const num = Number(v)
      if (!Number.isFinite(num) || num < 0 || num > 999999) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
      }
      updates.price_override = Math.round(num * 100) / 100
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('binder_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status, price_override, market_price')
      .single()
    if (error) throw error

    return NextResponse.json({ card: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}