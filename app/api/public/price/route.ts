import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_BASE = 'https://api.tcgdex.net/v2/en/cards'

// Cache en memoria por instancia + revalidate del fetch de Next (3600s).
// La calculadora de la home pide a lo sumo 2 cartas por sesión, así que el
// impacto en TCGdex es mínimo.
const priceCache = new Map<string, number | null>()

// Precio comercial de una carta del catálogo (card_id: "set-número").
// TCGplayer (USD) primero, Cardmarket (EUR) como fallback — mismo criterio
// que /api/binder/update-prices.
export async function GET(req: Request) {
  const cardId = (new URL(req.url).searchParams.get('cardId') ?? '').trim()
  if (!cardId) {
    return NextResponse.json({ error: 'Falta cardId' }, { status: 400 })
  }

  if (priceCache.has(cardId)) {
    return NextResponse.json({ cardId, price: priceCache.get(cardId) ?? null })
  }

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cardId)}`, {
      next: { revalidate: 3600 }
    })

    if (res.status === 404) {
      priceCache.set(cardId, null)
      return NextResponse.json({ cardId, price: null })
    }
    if (!res.ok) {
      throw new Error(`TCGdex respondió ${res.status} para ${cardId}`)
    }

    const json = await res.json()
    const tcg = json.pricing?.tcgplayer
    const price =
      tcg?.holofoil?.marketPrice ??
      tcg?.normal?.marketPrice ??
      tcg?.reverse?.marketPrice ??
      json.pricing?.cardmarket?.avg ??
      null

    priceCache.set(cardId, price)
    return NextResponse.json({ cardId, price })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
