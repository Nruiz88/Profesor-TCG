import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCardImage } from '@/lib/cardImage'
import { getCardMetadataMap } from '@/lib/catalog'
import { sanitizePlainText, sanitizeCardTitle } from '@/lib/sanitize'
import { normalizeCurrency } from '@/lib/priceGuide'
import { validateJson } from '@/lib/validate'
import { createWantlistSchema } from '@/lib/schemas'

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

    const meta = await getCardMetadataMap()
    const enriched = await Promise.all(
      (wantlist || []).map(async (w) => {
        const m = meta.get(w.card_id)
        return {
          ...w,
          rarity: m?.rarity ?? null,
          supertype: m?.supertype ?? null,
          subtypes: m?.subtypes ?? null,
          types: m?.types ?? null,
          image: await resolveCardImage(w.set_id, w.number)
        }
      })
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

  const bodyResult = await validateJson(createWantlistSchema, req)
  if (bodyResult.error) return bodyResult.error
  const { card_id: cardId, card_name: cardName, set_id: setId, set_name, number } = bodyResult.data

  const budgetRaw = (bodyResult.data as any).max_budget
  let maxBudget: number | null = null
  if (budgetRaw !== undefined && budgetRaw !== null && budgetRaw !== '') {
    const parsed = Number(budgetRaw)
    if (Number.isFinite(parsed) && parsed >= 0) {
      maxBudget = Math.round(parsed * 100) / 100
    }
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
          currency: normalizeCurrency((bodyResult.data as any).currency)
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