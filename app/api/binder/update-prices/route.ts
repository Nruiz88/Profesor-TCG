import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const CHUNK_SIZE = 20
const API_BASE = 'https://api.pokemontcg.io/v2/cards'

interface PricePayload {
  card_id: string
  market_price: number | null
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size))
  }
  return out
}

async function fetchPricesForChunk(cardIds: string[]): Promise<PricePayload[]> {
  const q = cardIds.map((id) => `id:"${id}"`).join(' OR ')
  const url = `${API_BASE}?q=${encodeURIComponent(q)}&pageSize=${CHUNK_SIZE}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`pokemontcg.io respondió ${res.status}`)

  const json = await res.json()
  const byId = new Map<string, number | null>()

  for (const card of json.data || []) {
    const market =
      card.tcgplayer?.prices?.holofoil?.market ??
      card.tcgplayer?.prices?.normal?.market ??
      null
    byId.set(card.id, market)
  }

  return cardIds.map((id) => ({
    card_id: id,
    market_price: byId.get(id) ?? null
  }))
}

export async function POST(req: Request) {
  let body: { cardIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const cardIds = [...new Set(body.cardIds || [])]
  if (cardIds.length === 0) {
    return NextResponse.json({ error: 'No se recibieron cardIds' }, { status: 400 })
  }
  if (cardIds.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 cartas por actualización' }, { status: 400 })
  }

  const supabase = getSupabase()

  try {
    const chunks = chunk(cardIds, CHUNK_SIZE)
    const results = await Promise.all(chunks.map(fetchPricesForChunk))
    const flat = results.flat()

    const { error } = await supabase
      .from('card_prices')
      .upsert(
        flat.map((p) => ({
          ...p,
          updated_at: new Date().toISOString()
        })),
        { onConflict: 'card_id' }
      )

    if (error) throw error

    const withPrice = flat.filter((p) => p.market_price != null).length

    return NextResponse.json({
      success: true,
      cards: flat.length,
      withPrice,
      withoutPrice: flat.length - withPrice,
      chunks: chunks.length
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}