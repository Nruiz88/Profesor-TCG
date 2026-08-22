import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pokeWalletSearch } from '@/lib/pokeWallet'
import { tcgApiSearch, tcgApiBudget } from '@/lib/tcgApi'
import { pokeTraceSearch, pokeTraceBudget } from '@/lib/pokeTrace'
import { toTcgdexCardId } from '@/lib/tcgdexId'

const API_BASE = 'https://api.tcgdex.net/v2/en/cards'
const CONCURRENCY = 10
const MAX_ATTEMPTS = 4
const BACKOFF_MS = 1000
const STALE_HOURS = 24

interface PriceEntry {
  card_id: string
  market_price: number | null
}

function backoff(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPriceForCard(cardId: string, attempt = 1): Promise<PriceEntry> {
  try {
    // El catálogo local usa IDs de pokemon-tcg-data; TCGdex tiene su propia
    // convención (sv5-51 → sv05-051, mcd22-5 → 2022swsh-5). Sin el mapeo la
    // consulta da 404 y se pierde la fuente exacta/gratuita.
    const tcgdexId = toTcgdexCardId(cardId)
    const res = await fetch(`${API_BASE}/${encodeURIComponent(tcgdexId)}`, {
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

  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // Verificamos que el binder pertenezca al usuario (RLS no permite lo contrario)
    const { data: binder } = await supabase
      .from('binders')
      .select('id')
      .eq('id', binderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
    }

    // Todas las filas del binder (datos completos para el upsert batch)
    const { data: rows, error: rowsError } = await supabase
      .from('binder_cards')
      .select('id, card_id, card_name, set_id, number, slot_number, market_price, updated_at')
      .eq('binder_id', binderId)
      .order('slot_number', { ascending: true })
    if (rowsError) throw rowsError

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'El binder no tiene cartas' }, { status: 400 })
    }

    // Si el cliente manda cardIds, acotamos a esas cartas
    let targetRows = rows
    if (body.cardIds && body.cardIds.length > 0) {
      const wanted = new Set(body.cardIds)
      targetRows = rows.filter((r) => wanted.has(r.card_id))
    }
    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'El binder no tiene cartas' }, { status: 400 })
    }

    // Staleness: solo re-fetcheamos cartas sin precio conocido o actualizadas hace más de STALE_HOURS
    const staleThreshold = Date.now() - STALE_HOURS * 60 * 60 * 1000
    const staleRows = targetRows.filter((r) => {
      const hasPrice = (r.market_price ?? 0) > 0
      const fresh = new Date(r.updated_at).getTime() >= staleThreshold
      return !hasPrice || !fresh
    })
    const skipped = targetRows.length - staleRows.length

    if (staleRows.length === 0) {
      return NextResponse.json({
        success: true,
        cards: 0,
        fetched: 0,
        fromCache: 0,
        withPrice: 0,
        withoutPrice: 0,
        failedCards: 0,
        skipped,
        source: 'tcgdex'
      })
    }

    const cardIds = [...new Set(staleRows.map((r) => r.card_id))]
    if (cardIds.length > 500) {
      return NextResponse.json({ error: 'Máximo 500 cartas por actualización' }, { status: 400 })
    }

    // Consultamos la caché global card_prices antes de pegarle a TCGdex.
    // Es best-effort: si la tabla no existe o el RLS la bloquea, seguimos sin caché.
    let cached: Array<{ card_id: string; market_price: number | null; updated_at: string }> | null = null
    try {
      const { data, error } = await supabase
        .from('card_prices')
        .select('card_id, market_price, updated_at')
        .in('card_id', cardIds)
      if (error) throw error
      cached = data
    } catch (err) {
      console.error('[update-prices] caché no disponible, continúo sin ella:', err)
    }

    const priceByCard = new Map<string, number | null>()
    const cacheThreshold = Date.now() - STALE_HOURS * 60 * 60 * 1000
    const cachedIds: string[] = []
    for (const entry of cached ?? []) {
      const cacheFresh =
        entry.market_price != null && new Date(entry.updated_at).getTime() >= cacheThreshold
      if (cacheFresh) {
        cachedIds.push(entry.card_id)
        priceByCard.set(entry.card_id, entry.market_price)
      }
    }

    // Solo fetch a TCGdex para las que no tienen caché fresca
    const toFetch = cardIds.filter((id) => !cachedIds.includes(id))
    let fetched: PriceEntry[] = []
    let failedCards = 0
    if (toFetch.length > 0) {
      const results = await mapLimit(toFetch, CONCURRENCY, (cardId) => fetchPriceForCard(cardId))
      fetched = results.filter((r): r is PriceEntry => r !== null && r !== undefined)
      failedCards = toFetch.length - fetched.length

      if (fetched.length === 0) {
        return NextResponse.json(
          { error: `Todas las cartas fallaron (${failedCards}). Reintentá en un momento.` },
          { status: 502 }
        )
      }

      // Guardamos lo fetcheado en la caché compartida (best-effort)
      try {
        const cacheUpdatedAt = new Date().toISOString()
        const { error: cacheUpsertError } = await supabase.from('card_prices').upsert(
          fetched.map((p) => ({
            card_id: p.card_id,
            market_price: p.market_price,
            updated_at: cacheUpdatedAt
          })),
          { onConflict: 'card_id' }
        )
        if (cacheUpsertError) throw cacheUpsertError
      } catch (err) {
        console.error('[update-prices] no se pudo escribir en la caché:', err)
      }

      for (const p of fetched) {
        priceByCard.set(p.card_id, p.market_price)
      }
    }

    // Fallback PokeWallet (si hay API key configurada): solo las cartas que
    // TCGdex no cubrió (sin precio), con tope de 20 por lote y concurrencia
    // baja para respetar la cuota gratuita de la API.
    let pokeWalletFilled = 0
    const noPriceRows = targetRows
      .filter((r) => {
        const p = priceByCard.get(r.card_id)
        return p == null || p <= 0
      })
      .slice(0, 20)

    if (noPriceRows.length > 0) {
      const pwResults = await mapLimit(noPriceRows, 3, async (row) => {
        const pw = await pokeWalletSearch({
          cardName: row.card_name,
          number: row.number,
          set: row.set_id
        })
        return pw ? { card_id: row.card_id, price: pw.price } : null
      })
      for (const r of pwResults) {
        if (r) {
          priceByCard.set(r.card_id, r.price)
          pokeWalletFilled++
        }
      }
    }

    // Fallback PokéTrace (si hay API key y cuota disponible): cartas que ni
    // TCGdex ni PokeWallet cubrieron. Tope de 15 por lote, concurrencia 2.
    let pokeTraceFilled = 0
    const pokeTraceRows = targetRows
      .filter((r) => {
        const p = priceByCard.get(r.card_id)
        return p == null || p <= 0
      })
      .slice(0, 15)

    if (pokeTraceRows.length > 0) {
      const ptBudget = pokeTraceBudget()
      if (ptBudget.remaining > 0) {
        const ptResults = await mapLimit(pokeTraceRows, 2, async (row) => {
          const pt = await pokeTraceSearch({
            cardName: row.card_name,
            number: row.number,
            set: row.set_id
          })
          return pt ? { card_id: row.card_id, price: pt.price } : null
        })
        for (const r of ptResults) {
          if (r) {
            priceByCard.set(r.card_id, r.price)
            pokeTraceFilled++
          }
        }
      }
    }

    // Fallback TCGAPI (si hay API key y cuota disponible): cartas que ni
    // TCGdex, PokeWallet ni PokéTrace cubrieron. Tope de 10 por lote, concurrencia 2.
    let tcgApiFilled = 0
    const stillNoPriceRows = targetRows
      .filter((r) => {
        const p = priceByCard.get(r.card_id)
        return p == null || p <= 0
      })
      .slice(0, 10)

    if (stillNoPriceRows.length > 0) {
      const tcgBudget = tcgApiBudget()
      if (tcgBudget.remaining > 0) {
        const tcgResults = await mapLimit(stillNoPriceRows, 2, async (row) => {
          const price = await tcgApiSearch({
            cardName: row.card_name,
            number: row.number,
            set: row.set_id
          })
          return price ? { card_id: row.card_id, price: price.market_price } : null
        })
        for (const r of tcgResults) {
          if (r) {
            priceByCard.set(r.card_id, r.price)
            tcgApiFilled++
          }
        }
      }
    }

    const updatedAt = new Date().toISOString()

    // Un solo upsert batch (PK única: binder_id + slot_number)
    const { error: upsertError } = await supabase.from('binder_cards').upsert(
      staleRows.map((row) => ({
        binder_id: binderId,
        slot_number: row.slot_number,
        card_id: row.card_id,
        card_name: row.card_name,
        set_id: row.set_id,
        number: row.number,
        market_price: priceByCard.get(row.card_id) ?? 0,
        updated_at: updatedAt
      })),
      { onConflict: 'binder_id,slot_number' }
    )
    if (upsertError) throw upsertError

    const resolved = priceByCard.size
    const withPrice = [...priceByCard.values()].filter((v) => v != null).length

    return NextResponse.json({
      success: true,
      cards: resolved,
      fetched: fetched.length,
      fromCache: cachedIds.length,
      withPrice,
      withoutPrice: resolved - withPrice,
      failedCards,
      skipped,
      pokeWalletFilled,
      pokeTraceFilled,
      tcgApiFilled,
      source: 'tcgdex'
    })
  } catch (err) {
    console.error('[update-prices] error:', err)
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}