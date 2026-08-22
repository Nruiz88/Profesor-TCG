import { NextResponse } from 'next/server'
import { getCardMetadataMap } from '@/lib/catalog'
import { pokeWalletSearch } from '@/lib/pokeWallet'
import { pokeTraceSearch } from '@/lib/pokeTrace'
import { tcgApiSearch, tcgApiBudget } from '@/lib/tcgApi'
import { toTcgdexCardId } from '@/lib/tcgdexId'
import { validate, extractParams } from '@/lib/validate'
import { priceSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

const API_BASE = 'https://api.tcgdex.net/v2/en/cards'

// Cache en memoria por instancia + revalidate del fetch de Next (3600s).
// La calculadora de la home pide a lo sumo 2 cartas por sesión, así que el
// impacto en TCGdex es mínimo.
const priceCache = new Map<string, number | null>()

// Precio comercial de una carta del catálogo (card_id: "set-número").
// 1. TCGplayer (USD) primero, Cardmarket (EUR) como fallback — vía TCGdex.
// 2. PokéTrace como fuente de respaldo si TCGdex no tiene valor.
// 3. PokeWallet si PokéTrace tampoco cubrió la carta.
// 4. TCGAPI como última fuente (tcgapi.dev, respeta su cuota diaria).
//    Los fallbacks buscan por nombre + número y solo aceptan la impresión
//    exacta (nunca una carta homónima de otro set).
export async function GET(req: Request) {
  const params = validate(priceSchema, extractParams(req))
  if (params.error) return params.error
  const { cardId } = params.data

  if (priceCache.has(cardId)) {
    return NextResponse.json({ cardId, price: priceCache.get(cardId) ?? null })
  }

  let price: number | null = null

  try {
    // El catálogo local usa IDs de pokemon-tcg-data; TCGdex tiene su propia
    // convención (sv5-51 → sv05-051, mcd22-5 → 2022swsh-5).
    const tcgdexId = toTcgdexCardId(cardId)
    const res = await fetch(`${API_BASE}/${encodeURIComponent(tcgdexId)}`, {
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

  // Fallback PokéTrace: cartas que TCGdex no cubre (404 o sin precio)
  if (price == null) {
    try {
      const meta = await getCardMetadataMap()
      const m = meta.get(cardId)
      if (m) {
        const pt = await pokeTraceSearch({ cardName: m.name, number: m.number, set: m.setId })
        if (pt) price = pt.price
      }
    } catch {
      // fallback también falló: continuamos con PokeWallet
    }
  }

  // Fallback PokeWallet: si PokéTrace tampoco cubrió la carta
  if (price == null) {
    try {
      const meta = await getCardMetadataMap()
      const m = meta.get(cardId)
      if (m) {
        const pw = await pokeWalletSearch({ cardName: m.name, number: m.number, set: m.setId })
        if (pw) price = pw.price
      }
    } catch {
      // fallback también falló: continuamos con TCGAPI
    }
  }

  // Fallback TCGAPI: si ninguno de los anteriores cubrió la carta (y quedan
  // consultas de la cuota diaria), la buscamos por nombre + número exacto.
  if (price == null) {
    try {
      const meta = await getCardMetadataMap()
      const m = meta.get(cardId)
      if (m) {
        const tcgBudget = tcgApiBudget()
        if (tcgBudget.remaining > 0) {
          const tcg = await tcgApiSearch({ cardName: m.name, number: m.number, set: m.setId })
          if (tcg) price = tcg.market_price
        }
      }
    } catch {
      // fallback también falló: price queda null
    }
  }

  priceCache.set(cardId, price)
  return NextResponse.json({ cardId, price })
}
