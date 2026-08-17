import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap, getSets } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { effectivePrice } from '@/lib/cardStatus'
import { isCardLanguage } from '@/lib/cardLanguage'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 120

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type AdminClient = ReturnType<typeof createAdminClient>

// Tipo estructural mínimo para funciones compartidas entre el cliente regular
// (RLS) y el de service role: ambos exponen .from(table) con la misma cadena.
type QueryClient = {
  from: (table: string) => any
}

// Fila cruda de la query anidada binder_cards -> binders
interface ExploreCardRow {
  id: string
  binder_id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  slot_number: number
  market_price: number | null
  status: string | null
  price_override: number | null
  is_for_sale: boolean | null
  is_for_trade: boolean | null
  price: number | null
  trade_notes: string | null
  language: string | null
  manual_price: number | null
  currency: string | null
  is_user_reported: boolean | null
  updated_at: string
  binders: {
    id: string
    title: string
    user_id: string
    is_public: boolean
  } | null
}

// Perfil del vendedor (lectura con service role: una carta en venta/cambio es
// pública por sí misma aunque su binder esté privado)
interface SellerProfile {
  username: string
  city: string | null
  country: string | null
  whatsapp_number: string | null
}

// Perfiles por user_id — consulta aparte porque binders.user_id apunta a
// auth.users y no hay FK directo hacia profiles (PostgREST no puede anidarlos).
async function getProfilesByUserId(
  supabase: QueryClient,
  userIds: string[]
): Promise<Map<string, SellerProfile>> {
  if (userIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, city, country, whatsapp_number')
    .in('id', userIds)
  if (error) throw error
  return new Map(
    (data || []).map(
      (p: {
        id: string
        username: string
        city: string | null
        country: string | null
        whatsapp_number: string | null
      }) => [
        p.id,
        {
          username: p.username,
          city: p.city,
          country: p.country,
          whatsapp_number: p.whatsapp_number
        }
      ]
    )
  )
}

export interface ExploreCard {
  id: string
  binder_id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string
  number: string
  rarity: string | null
  language: string | null
  currency: string | null
  is_user_reported: boolean | null
  status: 'for_sale' | 'for_trade'
  price: number | null
  image: string
  username: string
  city: string | null
  country: string | null
  whatsapp_number: string | null
  binder_public: boolean
  updated_at: string
}

export interface ExploreFacets {
  sets: { id: string; name: string }[]
  rarities: string[]
  cities: string[]
}

interface PublicBinderRow {
  id: string
  title: string
  user_id: string
  cover_card_id: string | null
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const view = searchParams.get('view') === 'binders' ? 'binders' : 'cards'
  const mode = searchParams.get('mode') ?? 'all'
  const q = (searchParams.get('q') ?? '').trim()
  const setFilter = searchParams.get('set') ?? ''
  const rarityFilter = searchParams.get('rarity') ?? ''
  const cityFilter = (searchParams.get('city') ?? '').trim()
  const typeFilter = searchParams.get('type') ?? ''
  const languageFilter = searchParams.get('language') ?? ''
  const sort = searchParams.get('sort') ?? 'recent'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '60', 10) || 60, MAX_LIMIT)

  try {
    if (view === 'binders') {
      return await getBinders(supabase)
    }

    // La vista de cartas usa service role: una carta marcada en venta/cambio
    // es pública por sí misma y debe aparecer en el marketplace aunque su
    // binder esté privado (solo esa carta, no el binder completo).
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const cardsClient =
      serviceKey && url ? createAdminClient(url, serviceKey) : supabase

    return await getCards(cardsClient, {
      mode,
      q,
      setFilter,
      rarityFilter,
      cityFilter,
      typeFilter,
      languageFilter,
      sort,
      limit
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function getCards(
  supabase: QueryClient,
  opts: {
    mode: string
    q: string
    setFilter: string
    rarityFilter: string
    cityFilter: string
    typeFilter: string
    languageFilter: string
    sort: string
    limit: number
  }
) {
  // Filtro por disponibilidad usando las flags (is_for_sale / is_for_trade):
  // una carta "venta_o_cambio" aparece tanto en modo venta como en cambio.
  let query = supabase
    .from('binder_cards')
    .select(
      `id, binder_id, card_id, card_name, set_id, number, slot_number,
       market_price, status, price_override, is_for_sale, is_for_trade,
       price, trade_notes, condition, language, manual_price, currency,
       is_user_reported, updated_at,
       binders!binder_cards_binder_id_fkey!inner (
         id, title, user_id, is_public
       )`
    )
    .or('is_for_sale.eq.true,is_for_trade.eq.true')

  if (opts.mode === 'for_sale') {
    query = query.eq('is_for_sale', true)
  } else if (opts.mode === 'for_trade') {
    query = query.eq('is_for_trade', true)
  }

  if (opts.q) {
    query = query.ilike('card_name', `%${opts.q}%`)
  }
  if (opts.setFilter) {
    query = query.eq('set_id', opts.setFilter)
  }
  if (opts.languageFilter && isCardLanguage(opts.languageFilter)) {
    query = query.eq('language', opts.languageFilter)
  }

  const { data, error } = await query.limit(MAX_LIMIT)
  if (error) throw error

  const rows = (data || []) as unknown as ExploreCardRow[]

  // Metadata del catálogo (rareza, etc.), nombres de set y perfiles de vendedores
  const userIds = [...new Set(rows.map((r) => r.binders?.user_id).filter(Boolean) as string[])]
  const [meta, sets, profiles] = await Promise.all([
    getCardMetadataMap(),
    getSets(),
    getProfilesByUserId(supabase, userIds)
  ])
  const setNameById = new Map(sets.map((s) => [s.id, s.name]))

  const enriched: ExploreCard[] = []
  for (const r of rows) {
    const m = meta.get(r.card_id)
    const seller = r.binders?.user_id ? profiles.get(r.binders.user_id) ?? null : null
    const status = r.is_for_sale ? 'for_sale' : 'for_trade'
    const price = effectivePrice(r.market_price, r.price_override, r.price)
    const rarity = m?.rarity ?? null

    // Filtros que dependen de la metadata (rareza, tipo) o del perfil (ciudad)
    if (opts.rarityFilter && rarity !== opts.rarityFilter) continue
    if (opts.cityFilter && seller?.city !== opts.cityFilter) continue
    if (opts.typeFilter && !(m?.types ?? []).includes(opts.typeFilter)) continue

    enriched.push({
      id: r.id,
      binder_id: r.binder_id,
      card_id: r.card_id,
      card_name: r.card_name,
      set_id: r.set_id,
      set_name: setNameById.get(r.set_id) ?? r.set_id,
      number: r.number,
      rarity,
      language: r.language ?? null,
      currency: r.currency ?? 'USD',
      is_user_reported: r.is_user_reported ?? false,
      status,
      price,
      image: await resolveCardImage(r.set_id, r.number),
      username: seller?.username ?? 'coleccionista',
      city: seller?.city ?? null,
      country: seller?.country ?? null,
      whatsapp_number: seller?.whatsapp_number ?? null,
      binder_public: !!r.binders?.is_public,
      updated_at: r.updated_at
    })
  }

  // Ordenamiento
  if (opts.sort === 'price_asc') {
    enriched.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
  } else if (opts.sort === 'price_desc') {
    enriched.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity))
  } else {
    enriched.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  }

  const cards = enriched.slice(0, opts.limit)

  // Facets: sets, rarezas y ciudades presentes en el resultado completo
  const setMap = new Map<string, string>()
  for (const c of enriched) setMap.set(c.set_id, c.set_name)
  const rarities = [...new Set(enriched.map((c) => c.rarity).filter(Boolean) as string[])].sort()
  const cities = [...new Set(enriched.map((c) => c.city).filter(Boolean) as string[])].sort()

  const facets: ExploreFacets = {
    sets: [...setMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    rarities,
    cities
  }

  return NextResponse.json({ cards, facets })
}

export interface ExploreBinder {
  id: string
  title: string
  username: string
  city: string | null
  country: string | null
  whatsapp_number: string | null
  saleCount: number
  tradeCount: number
  totalActive: number
  coverImage: string
}

async function getBinders(supabase: SupabaseClient) {
  // Conteo de cartas activas (venta/cambio) y portada por binder
  const { data: activeCards, error: cardsError } = await supabase
    .from('binder_cards')
    .select('id, binder_id, set_id, number, is_for_sale, is_for_trade')
    .or('is_for_sale.eq.true,is_for_trade.eq.true')
    .limit(1000)
  if (cardsError) throw cardsError

  const byBinder = new Map<
    string,
    { sale: number; trade: number; cover: { set_id: string; number: string } | null }
  >()
  // card_id -> imagen, para resolver la portada configurada por el usuario
  const coverByCardId = new Map<string, { set_id: string; number: string }>()
  for (const c of activeCards || []) {
    const entry = byBinder.get(c.binder_id) ?? {
      sale: 0,
      trade: 0,
      cover: null
    }
    // Una carta "venta_o_cambio" cuenta en ambas categorías
    if (c.is_for_sale) entry.sale++
    if (c.is_for_trade) entry.trade++
    if (!entry.cover) {
      entry.cover = { set_id: c.set_id, number: c.number }
    }
    coverByCardId.set(c.id, { set_id: c.set_id, number: c.number })
    byBinder.set(c.binder_id, entry)
  }

  const binderIds = [...byBinder.keys()]
  if (binderIds.length === 0) {
    return NextResponse.json({ binders: [], facets: null })
  }

  const { data: binders, error } = await supabase
    .from('binders')
    .select('id, title, user_id, cover_card_id')
    .in('id', binderIds)
    .eq('is_public', true)
  if (error) throw error

  const rows = (binders || []) as unknown as PublicBinderRow[]
  const profiles = await getProfilesByUserId(
    supabase,
    [...new Set(rows.map((r) => r.user_id))]
  )

  const result: ExploreBinder[] = await Promise.all(
    rows.map(async (b) => {
      const stats = byBinder.get(b.id) ?? { sale: 0, trade: 0, cover: null }
      // Portada: la carta configurada por el usuario si es activa, si no la primera activa
      const chosen = (b.cover_card_id && coverByCardId.get(b.cover_card_id)) ?? stats.cover
      const seller = profiles.get(b.user_id) ?? null
      return {
        id: b.id,
        title: b.title,
        username: seller?.username ?? 'coleccionista',
        city: seller?.city ?? null,
        country: seller?.country ?? null,
        whatsapp_number: seller?.whatsapp_number ?? null,
        saleCount: stats.sale,
        tradeCount: stats.trade,
        totalActive: stats.sale + stats.trade,
        coverImage: chosen
          ? await resolveCardImage(chosen.set_id, chosen.number)
          : ''
      }
    })
  )

  result.sort((a, b) => b.totalActive - a.totalActive)

  return NextResponse.json({ binders: result, facets: null })
}
