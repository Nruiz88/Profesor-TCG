import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  availabilityToFlags,
  isAvailability,
  isCardStatus,
  statusFromAvailability
} from '@/lib/cardStatus'

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
  availability?: unknown
  price?: unknown
  trade_notes?: unknown
  condition?: unknown
}

// Actualizar la modalidad de disponibilidad (availability), el precio manual y
// las notas de intercambio de una carta del binder propio. RLS impide tocar
// cartas de otros usuarios. Se mantienen sincronizados status (derivado) y
// price_override (legacy) para el resto de la app.
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

  const updates: Record<string, string | number | boolean | null> = {}

  // Modalidad de disponibilidad -> flags + status derivado (legacy)
  if (body.availability !== undefined) {
    if (!isAvailability(body.availability)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    const flags = availabilityToFlags(body.availability)
    updates.is_for_sale = flags.isForSale
    updates.is_for_trade = flags.isForTrade
    updates.status = statusFromAvailability(body.availability)
  }

  // Precio manual (nuevo) y price_override (legacy, se mantiene en sync)
  if (body.price !== undefined) {
    const v = body.price
    if (v === null || v === '') {
      updates.price = null
      updates.price_override = null
    } else {
      const num = Number(v)
      if (!Number.isFinite(num) || num < 0 || num > 999999) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
      }
      const rounded = Math.round(num * 100) / 100
      updates.price = rounded
      updates.price_override = rounded
    }
  }

  // Notas de intercambio ("¿Qué busco a cambio?")
  if (body.trade_notes !== undefined) {
    const v = body.trade_notes
    if (v === null) {
      updates.trade_notes = null
    } else if (typeof v === 'string') {
      updates.trade_notes = v.trim() === '' ? null : v.trim().slice(0, 500)
    } else {
      return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })
    }
  }

  // Condición física de la carta (Mint / Near Mint / Excellent / …)
  if (body.condition !== undefined) {
    const v = body.condition
    if (v === null || v === '') {
      updates.condition = null
    } else if (typeof v === 'string') {
      updates.condition = v.trim().slice(0, 40)
    } else {
      return NextResponse.json({ error: 'Condición inválida' }, { status: 400 })
    }
  }

  // Backwards-compat: el body viejo seguía enviando status / price_override
  if (body.status !== undefined) {
    if (!isCardStatus(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body.price_override !== undefined && body.price === undefined) {
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
      .select(
        'id, status, price_override, market_price, is_for_sale, is_for_trade, price, trade_notes, condition, reserved_until'
      )
      .single()
    if (error) throw error

    return NextResponse.json({ card: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}