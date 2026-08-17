import { NextResponse } from 'next/server'
import { getCardMetadataMap } from '@/lib/catalog'
import { pokeWalletSearch } from '@/lib/pokeWallet'

export const dynamic = 'force-dynamic'

const API_BASE = 'https://api.tcgdex.net/v2/en/cards'

// Cache en memoria por instancia + revalidate del fetch de Next (3600s).
// La calculadora de la home pide a lo sumo 2 cartas por sesión, así que el
// impacto en TCGdex es mínimo.
const priceCache = new Map<string, number | null>()

// Precio comercial de una carta del catálogo (card_id: "set-número").
// 1. TCGplayer (USD) primero, Cardmarket (EUR) como fallback — vía TCGdex.
// 2. PokeWallet como fuente de respaldo si TCGdex no tiene valor (solo si hay
//    API key configurada; se lee en el servidor, nunca en el cliente).
export async function GET(req: Request) {
  const cardId = (new URL(req.url).searchParams.get('cardId') ?? '').trim()
  if (!cardId) {
    return NextResponse.json({ error: 'Falta cardId' }, { status: 400 })
  }

  if (priceCache.has(cardId)) {
    return NextResponse.json({ cardId, price: priceCache.get(cardId) ?? null })
  }

  let price: number | null = null

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(cardId)}`, {
      next: { revalidate: 3600 }
    })

    if (res.status !== 404) {
      if (res.ok) {
        const json = await res.json()
        const tcg = json.pricing?.tcgplayer
        price =
          tcg?.holofoil?.marketPrice ??
          tcg?.normal?.marketPrice ??
          tcg?.reverse?.marketPrice ??
          json.pricing?.cardmarket?.avg ??
          null
      } else {
        throw new Error(`TCGdex respondió ${res.status} para ${cardId}`)
      }
    }
  } catch {
    // TCGdex caído: continuamos con el fallback de PokeWallet
  }

  // Fallback PokeWallet: cartas que TCGdex no cubre (404 o sin precio)
  if (price == null) {
    try {
      const meta = await getCardMetadataMap()
      const m = meta.get(cardId)
      if (m) {
        const pw = await pokeWalletSearch({ cardName: m.name, number: m.number })
        if (pw) price = pw.price
      }
    } catch {
      // fallback también falló: price queda null
    }
  }

  priceCache.set(cardId, price)
  return NextResponse.json({ cardId, price })
}
