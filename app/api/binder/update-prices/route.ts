import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const API_BASE = 'https://api.tcgdex.net/v2/en/cards'
const CONCURRENCY = 10
const MAX_ATTEMPTS = 4
const BACKOFF_MS = 1000

interface PriceEntry {
  card_id: string
  market_price: number | null
}

function backoff(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPriceForCard(cardId: string, attempt = 1): Promise<PriceEntry> {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cardId)}`, {
      cache: 'no-store'
    })

    if (res.status === 404) {
      return { card_id: cardId, market_price: null }
    }

    if (res.status === 429 || res.status >= 500) {
      if (attempt < MAX_ATTEMPTS) {
        await backoff(BACKOFF_MS * attempt)
        return fetchPriceForCard(cardId, attempt + 1)
      }
      throw new Error(`TCGdex respondió ${res.status} para ${cardId}`)
    }

    if (!res.ok) {
      throw new Error(`TCGdex respondió ${res.status} para ${cardId}`)
    }

    const json = await res.json()

    // TCGplayer (USD) primero, Cardmarket (EUR) como fallback
    const tcg = json.pricing?.tcgplayer
    const market =
      tcg?.holofoil?.marketPrice ??
      tcg?.normal?.marketPrice ??
      tcg?.reverse?.marketPrice ??
      json.pricing?.cardmarket?.avg ??
      null

    return { card_id: cardId, market_price: market }
  } catch (err) {
    const isHttpError = err instanceof Error && err.message.startsWith('TCGdex')
    if (isHttpError && attempt >= MAX_ATTEMPTS) {
      throw err
    }
    if (attempt < MAX_ATTEMPTS) {
      await backoff(BACKOFF_MS * attempt)
      return fetchPriceForCard(cardId, attempt + 1)
    }
    throw err
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export async function POST(req: Request) {
  let body: { binderId?: string; cardIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const binderId = body.binderId
  if (!binderId) {
    return NextResponse.json({ error: 'Falta binderId' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    let cardIds = body.cardIds

    if (!cardIds || cardIds.length === 0) {
      const { data, error: readError } = await supabase
        .from('binder_cards')
        .select('card_id')
        .eq('binder_id', binderId)
      if (readError) throw readError
      cardIds = (data || []).map((r) => r.card_id)
    }

    cardIds = [...new Set(cardIds)]
    if (cardIds.length === 0) {
      return NextResponse.json({ error: 'El binder no tiene cartas' }, { status: 400 })
    }
    if (cardIds.length > 500) {
      return NextResponse.json({ error: 'Máximo 500 cartas por actualización' }, { status: 400 })
    }

    const results = await mapLimit(cardIds, CONCURRENCY, (cardId) => fetchPriceForCard(cardId))

    const flat: PriceEntry[] = results.filter(
      (r): r is PriceEntry => r !== null && r !== undefined
    )
    const failedCards = cardIds.length - flat.length

    if (flat.length === 0) {
      return NextResponse.json(
        { error: `Todas las cartas fallaron (${failedCards}). Reintentá en un momento.` },
        { status: 502 }
      )
    }

    // Actualizamos market_price en cada fila de binder_cards del binder
    const priceByCard = new Map(flat.map((p) => [p.card_id, p.market_price]))
    const cardIdsToUpdate = [...priceByCard.keys()]

    const { data: rows, error: rowsError } = await supabase
      .from('binder_cards')
      .select('id, card_id')
      .eq('binder_id', binderId)
      .in('card_id', cardIdsToUpdate)
    if (rowsError) throw rowsError

    const updatedAt = new Date().toISOString()

    const updates = (rows || []).map((row) =>
      supabase
        .from('binder_cards')
        .update({
          market_price: priceByCard.get(row.card_id) ?? 0,
          updated_at: updatedAt
        })
        .eq('id', row.id)
    )

    const updateResults = await Promise.all(updates)
    const updateError = updateResults.find((r) => r.error)?.error
    if (updateError) throw updateError

    const withPrice = flat.filter((p) => p.market_price != null).length

    return NextResponse.json({
      success: true,
      cards: flat.length,
      withPrice,
      withoutPrice: flat.length - withPrice,
      failedCards,
      source: 'tcgdex'
    })
  } catch (err) {
    console.error('[update-prices] error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}