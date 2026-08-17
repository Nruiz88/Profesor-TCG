import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCardImage } from '@/lib/cardImage'
import { sanitizePlainText, sanitizeCardTitle } from '@/lib/sanitize'
import { normalizeCurrency } from '@/lib/priceGuide'

export const dynamic = 'force-dynamic'

const WANTLIST_SELECT = 'id, card_id, card_name, set_id, set_name, number, max_budget, currency, created_at'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: wantlist, error } = await supabase
      .from('wantlist_cards')
      .select(WANTLIST_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const enriched = await Promise.all(
      (wantlist || []).map(async (w) => ({
        ...w,
        image: await resolveCardImage(w.set_id, w.number)
      }))
    )

    return NextResponse.json({ wantlist: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

  let body: {
    card_id?: unknown
    card_name?: unknown
    set_id?: unknown
    set_name?: unknown
    number?: unknown
    max_budget?: unknown
    currency?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const cardId = typeof body.card_id === 'string' ? body.card_id.trim() : ''
  const cardName = typeof body.card_name === 'string' ? body.card_name.trim() : ''
  const setId = typeof body.set_id === 'string' ? body.set_id.trim() : ''
  const number = typeof body.number === 'string' ? body.number.trim() : ''
  if (!cardId || !cardName || !setId || !number) {
    return NextResponse.json({ error: 'Faltan datos de la carta' }, { status: 400 })
  }

  const set_name =
    typeof body.set_name === 'string' && body.set_name.trim() !== ''
      ? body.set_name.trim().slice(0, 120)
      : null

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
      .upsert(
        {
          user_id: user.id,
          card_id: cardId,
          card_name: sanitizeCardTitle(cardName),
          set_id: setId,
          set_name: set_name ? sanitizePlainText(set_name) : null,
          number,
          max_budget: maxBudget,
          currency: normalizeCurrency(body.currency)
        },
        { onConflict: 'user_id,card_id' }
      )
      .select(WANTLIST_SELECT)
      .single()
    if (error) throw error

    return NextResponse.json({
      wantlist: {
        ...data,
        image: await resolveCardImage(data.set_id, data.number)
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}