// ============================================================================
// Páginas de catálogo por carta (/carta/[cardId]/[slug])
// ============================================================================
// Datos server-side para las páginas indexables de TODAS las cartas del
// catálogo (37k+), estén o no publicadas en el marketplace.
//
// Combina tres fuentes:
//  1. Catálogo local (src/content): nombre, rareza, tipo, HP, set, número.
//  2. Marketplace (Supabase): publicaciones activas de esa carta (venta/cambio).
//  3. Catálogo otra vez: cartas relacionadas (misma especie / mismo set).
//
// Las imágenes se resuelven SIN red usando el manifest precomputado
// (image-manifest.json): cada set sabe qué CDN lo cubre, así la generación de
// páginas es determinística y rápida (no HEAD requests por carta).
// ============================================================================

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap, getSets } from './catalog'
import { speciesFromCardName } from './pokedex'
import { effectivePrice } from './cardStatus'
import { NO_IMAGE_PLACEHOLDER, pokemontcgUrl } from './cardImage'
import { scrydexUrl, unpadNumber } from './cardImage/scrydex'
import { tcgdexUrl } from './cardImage/tcgdex'
import { slugify } from './utils'

// @ts-ignore — Next.js resuelve JSON imports en build time
import manifestData from '../content/image-manifest.json'
const manifest = manifestData as Record<string, string>

export interface CatalogListing {
  /** id del slot en binder_cards (para /card/<uuid>/<slug>). */
  binderCardId: string
  username: string | null
  city: string | null
  country: string | null
  price: number | null
  currency: string
  isForSale: boolean
  isForTrade: boolean
  image: string
  slug: string
}

export interface RelatedCard {
  id: string
  name: string
  number: string
  rarity: string | null
  image: string
  slug: string
}

export interface CatalogCardPageData {
  id: string
  name: string
  supertype: string
  subtypes: string[]
  types: string[]
  hp: string | null
  rarity: string | null
  number: string
  setId: string
  set_name: string
  series: string
  releaseDate: string | null
  printedTotal: number
  image: string
  species: string
  listingCount: number
  saleCount: number
  tradeCount: number
  minPrice: number | null
  avgPrice: number | null
  currency: string
  /** Conteo de publicaciones por país (del perfil del vendedor). */
  countries: { country: string; count: number }[]
  listings: CatalogListing[]
  /** Coleccionistas que tienen esta carta en su binder (público o no). */
  holderCount: number
  holders: { username: string | null; isPublic: boolean }[]
  /** Cartas que venden/cambian los dueños de esta carta (recomendación cruzada). */
  companionCards: RelatedCard[]
  /** Coleccionistas que buscan esta carta en su wantlist. */
  wantlistCount: number
  wantlistUsers: string[]
  sameSet: RelatedCard[]
  sameSpecies: RelatedCard[]
}

/** URL de imagen directa desde el manifest (sin verificar en red). */
export function catalogCardImage(setId: string, number: string): string {
  const source = manifest[setId]
  switch (source) {
    case 'pokemontcg':
      return pokemontcgUrl(setId, number)
    case 'scrydex':
      return scrydexUrl(setId, number)
    case 'scrydex-unpadded':
      return scrydexUrl(setId, unpadNumber(number))
    case 'tcgdex':
      return tcgdexUrl(setId, number, 'EN') ?? NO_IMAGE_PLACEHOLDER
    default:
      return NO_IMAGE_PLACEHOLDER
  }
}

interface ListingRow {
  id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  language: string | null
  market_price: number | null
  price_override: number | null
  price: number | null
  manual_price: number | null
  currency: string | null
  is_for_sale: boolean | null
  is_for_trade: boolean | null
  is_user_reported: boolean | null
  binders: { user_id: string } | null
}

async function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

function compareNumbers(a: string, b: string): number {
  const na = parseInt(a, 10)
  const nb = parseInt(b, 10)
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return a.localeCompare(b)
}

/** Datos completos de la página de catálogo de una carta. null si no existe. */
export async function getCatalogCardPageData(
  cardId: string
): Promise<CatalogCardPageData | null> {
  const meta = await getCardMetadataMap()
  const entry = meta.get(cardId)
  if (!entry) return null

  const sets = await getSets()
  const set = sets.find((s) => s.id === entry.setId)
  const species = speciesFromCardName(entry.name)

  // Publicaciones activas de esta carta en el marketplace.
  const listings: CatalogListing[] = []
  let minPrice: number | null = null
  let saleCount = 0
  let tradeCount = 0

  const client = await adminClient()
  if (client) {
    try {
      const { data: rows } = await client
        .from('binder_cards')
        .select(
          `id, card_id, card_name, set_id, number, language, market_price,
           price_override, price, manual_price, currency, is_for_sale,
           is_for_trade, is_user_reported,
           binders!binder_cards_binder_id_fkey!inner(user_id)`
        )
        .eq('card_id', cardId)
        .or('is_for_sale.eq.true,is_for_trade.eq.true')

      const raw = (rows ?? []) as unknown as ListingRow[]
      const userIds = [
        ...new Set(raw.map((r) => r.binders?.user_id).filter(Boolean) as string[])
      ]
      const usernameById = new Map<string, string | null>()
      const profileById = new Map<string, { city: string | null; country: string | null }>()
      if (userIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, username, city, country')
          .in('id', userIds)
        for (const p of profiles || []) {
          const row = p as {
            id: string
            username: string
            city: string | null
            country: string | null
          }
          usernameById.set(row.id, row.username)
          profileById.set(row.id, { city: row.city, country: row.country })
        }
      }

      for (const r of raw) {
        const price = effectivePrice(
          r.market_price,
          r.price_override,
          r.price,
          r.manual_price
        )
        const userId = r.binders?.user_id ?? null
        const profile = userId ? profileById.get(userId) : undefined
        if (r.is_for_sale) saleCount++
        if (r.is_for_trade) tradeCount++
        if (price != null && (minPrice == null || price < minPrice)) minPrice = price
        listings.push({
          binderCardId: r.id,
          username: userId ? (usernameById.get(userId) ?? null) : null,
          city: profile?.city ?? null,
          country: profile?.country ?? null,
          price,
          currency: r.currency ?? 'USD',
          isForSale: !!r.is_for_sale,
          isForTrade: !!r.is_for_trade,
          image: catalogCardImage(r.set_id, r.number),
          slug: slugify(r.card_name)
        })
      }
    } catch {
      // Sin service key o tabla indisponible: la página sigue sirviendo el
      // catálogo (solo sin listados).
    }
  }

  // Coleccionistas que tienen esta carta en su binder y quienes la buscan en su
  // wantlist: contenido dinámico por usuario que hace la página única y fresca.
  let holderCount = 0
  const holders: { username: string | null; isPublic: boolean }[] = []
  const holderBinderIds: string[] = []
  let wantlistCount = 0
  const wantlistUsers: string[] = []
  if (client) {
    try {
      const [holderRows, wantlistRows] = await Promise.all([
        client
          .from('binder_cards')
          .select(
            'id, binder_id, binders!binder_cards_binder_id_fkey!inner(id, user_id, is_public)'
          )
          .eq('card_id', cardId)
          .limit(50),
        client
          .from('wantlist_cards')
          .select('user_id')
          .eq('card_id', cardId)
          .limit(50)
      ])
      const holderRowsData = (holderRows.data ?? []) as unknown as Array<{
        binder_id: string
        binders: Array<{ id: string; user_id: string; is_public: boolean }>
      }>
      const userIds = [
        ...new Set([
          ...holderRowsData.map((r) => r.binders?.[0]?.user_id ?? ''),
          ...(wantlistRows.data ?? []).map((r: { user_id: string }) => r.user_id)
        ].filter(Boolean) as string[])
      ]
      const usernameById = new Map<string, string | null>()
      if (userIds.length > 0) {
        const { data: profiles } = await client
          .from('profiles')
          .select('id, username')
          .in('id', userIds)
        for (const p of profiles || []) {
          const row = p as { id: string; username: string }
          usernameById.set(row.id, row.username)
        }
      }
      for (const r of holderRowsData) {
        const binder = r.binders?.[0]
        const userId = binder?.user_id
        if (!userId) continue
        holderCount++
        if (r.binder_id) holderBinderIds.push(r.binder_id)
        if (holders.length < 20) {
          holders.push({
            username: usernameById.get(userId) ?? null,
            isPublic: !!binder.is_public
          })
        }
      }
      for (const r of wantlistRows.data ?? []) {
        const row = r as { user_id: string }
        wantlistCount++
        const uname = usernameById.get(row.user_id)
        if (uname && wantlistUsers.length < 20) wantlistUsers.push(uname)
      }
    } catch {
      // contenido dinámico opcional: no rompe la página si falla
    }
  }

  // Recomendación cruzada: qué otras cartas venden/cambian los dueños de esta
  // carta. Distribuye enlaces internos hacia el resto del catálogo.
  const companionCards: RelatedCard[] = []
  if (client && holderBinderIds.length > 0) {
    try {
      const { data: rows } = await client
        .from('binder_cards')
        .select(
          'id, card_id, card_name, set_id, number, rarity, market_price, price_override, price, manual_price, currency, is_for_sale, is_for_trade'
        )
        .in('binder_id', holderBinderIds)
        .or('is_for_sale.eq.true,is_for_trade.eq.true')
        .neq('card_id', cardId)
        .limit(60)
      const seen = new Set<string>()
      for (const r of rows || []) {
        const row = r as {
          id: string
          card_id: string
          card_name: string
          set_id: string
          number: string
          rarity: string | null
        }
        if (seen.has(row.card_id)) continue
        seen.add(row.card_id)
        if (companionCards.length >= 12) break
        companionCards.push({
          id: row.card_id,
          name: row.card_name,
          number: row.number,
          rarity: row.rarity ?? null,
          image: catalogCardImage(row.set_id, row.number),
          slug: slugify(row.card_name)
        })
      }
    } catch {
      // recomendación opcional: no rompe la página si falla
    }
  }

  // Cartas relacionadas desde el índice local (sin DB ni red).
  const sameSet: RelatedCard[] = []
  const sameSpecies: RelatedCard[] = []
  const limitRelated = 12
  if (meta.size > 0) {
    const all = Array.from(meta.values())
    for (const c of all) {
      if (sameSet.length >= limitRelated && sameSpecies.length >= limitRelated) break
      if (c.id === cardId) continue
      if (c.setId === entry.setId && sameSet.length < limitRelated) {
        sameSet.push({
          id: c.id,
          name: c.name,
          number: c.number,
          rarity: c.rarity ?? null,
          image: catalogCardImage(c.setId, c.number),
          slug: slugify(c.name)
        })
      }
      if (
        c.supertype === 'Pokémon' &&
        speciesFromCardName(c.name) === species &&
        sameSpecies.length < limitRelated
      ) {
        sameSpecies.push({
          id: c.id,
          name: c.name,
          number: c.number,
          rarity: c.rarity ?? null,
          image: catalogCardImage(c.setId, c.number),
          slug: slugify(c.name)
        })
      }
    }
    sameSet.sort((a, b) => compareNumbers(a.number, b.number))
  }

  listings.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))

  const priced = listings.filter((l) => l.price != null)
  const avgPrice =
    priced.length > 0
      ? priced.reduce((sum, l) => sum + (l.price ?? 0), 0) / priced.length
      : null
  const countryCounts = new Map<string, number>()
  for (const l of listings) {
    if (!l.country) continue
    countryCounts.set(l.country, (countryCounts.get(l.country) ?? 0) + 1)
  }
  const countries = [...countryCounts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    id: entry.id,
    name: entry.name,
    supertype: entry.supertype ?? '',
    subtypes: entry.subtypes ?? [],
    types: entry.types ?? [],
    hp: entry.hp ?? null,
    rarity: entry.rarity ?? null,
    number: entry.number,
    setId: entry.setId,
    set_name: set?.name ?? entry.setId,
    series: set?.series ?? '',
    releaseDate: set?.releaseDate ?? null,
    printedTotal: set?.printedTotal ?? 0,
    image: catalogCardImage(entry.setId, entry.number),
    species,
    listingCount: listings.length,
    saleCount,
    tradeCount,
    minPrice,
    avgPrice,
    currency: listings.find((l) => l.price != null)?.currency ?? 'USD',
    countries,
    listings,
    holderCount,
    holders,
    companionCards,
    wantlistCount,
    wantlistUsers,
    sameSet,
    sameSpecies
  }
}

// ============================================================================
// Generación estática
// ============================================================================

export interface CatalogCardParam {
  cardId: string
  slug: string
}

/**
 * Pre-renderiza solo las cartas con actividad en el marketplace (las que más
 * se buscan: tienen precio y vendedores). El resto se renderiza on-demand y se
 * cachea con ISR (dynamicParams = true).
 */
export async function getCatalogStaticParams(
  limit = 1000
): Promise<CatalogCardParam[]> {
  const client = await adminClient()
  if (!client) return []

  let params: CatalogCardParam[] = []
  try {
    const { data: rows } = await client
      .from('binder_cards')
      .select('card_id, card_name')
      .or('is_for_sale.eq.true,is_for_trade.eq.true')
      .order('updated_at', { ascending: false })
      .limit(limit)
    const seen = new Set<string>()
    for (const r of rows || []) {
      const row = r as { card_id: string; card_name: string }
      if (seen.has(row.card_id)) continue
      seen.add(row.card_id)
      params.push({ cardId: row.card_id, slug: slugify(row.card_name) })
    }
  } catch {
    // Sin service key: la página sigue funcionando on-demand.
  }
  return params
}

/** Nombre de la carta para la URL (compatible con el slug). */
export function cardSlug(name: string): string {
  return slugify(name)
}

// ============================================================================
// Páginas por set (/expansion/[setId]) y por especie (/especie/[slug])
// ============================================================================

export interface CatalogSetPageData {
  id: string
  name: string
  series: string
  releaseDate: string | null
  printedTotal: number
  total: number
  logo: string | null
  symbol: string | null
  cardCount: number
  minPrice: number | null
  currency: string
  listingCount: number
  saleCount: number
  tradeCount: number
  cards: RelatedCard[]
  featured: RelatedCard[]
}

export interface CatalogSpeciesPageData {
  slug: string
  name: string
  cardCount: number
  minPrice: number | null
  currency: string
  listingCount: number
  saleCount: number
  tradeCount: number
  prints: RelatedCard[]
  types: string[]
}

// @ts-ignore — Next.js resuelve JSON imports en build time
import setLogosData from '../content/set-logos.json'
const setLogos = setLogosData as Record<string, string>

/** URL del logo del set: set-logos.json (Scrydex) → pokemontcg.io → null. */
export function setLogoUrl(set: { id: string; images?: { logo?: string } }): string | null {
  return setLogos[set.id] ?? set.images?.logo ?? null
}

/** Precio mínimo entre las publicaciones activas de un grupo de cartas. */
function minPriceOf(prices: Array<number | null>): number | null {
  let min: number | null = null
  for (const p of prices) {
    if (p != null && (min == null || p < min)) min = p
  }
  return min
}

async function fetchActiveListingsForCardIds(
  cardIds: string[]
): Promise<{
  count: number
  saleCount: number
  tradeCount: number
  minPrice: number | null
  currency: string
  byCardId: Map<string, CatalogListing[]>
}> {
  const byCardId = new Map<string, CatalogListing[]>()
  let count = 0
  let saleCount = 0
  let tradeCount = 0
  const prices: number[] = []
  let currency = 'USD'

  const client = await adminClient()
  if (!client || cardIds.length === 0) {
    return { count, saleCount, tradeCount, minPrice: null, currency, byCardId }
  }

  try {
    const { data: rows } = await client
      .from('binder_cards')
      .select(
        `id, card_id, card_name, set_id, number, language, market_price,
         price_override, price, manual_price, currency, is_for_sale,
         is_for_trade,
         binders!binder_cards_binder_id_fkey!inner(user_id)`
      )
      .in('card_id', cardIds)
      .or('is_for_sale.eq.true,is_for_trade.eq.true')

    const raw = (rows ?? []) as unknown as ListingRow[]
    const userIds = [
      ...new Set(raw.map((r) => r.binders?.user_id).filter(Boolean) as string[])
    ]
    const usernameById = new Map<string, string | null>()
    const profileById = new Map<string, { city: string | null; country: string | null }>()
    if (userIds.length > 0) {
      const { data: profiles } = await client
        .from('profiles')
        .select('id, username, city, country')
        .in('id', userIds)
      for (const p of profiles || []) {
        const row = p as {
          id: string
          username: string
          city: string | null
          country: string | null
        }
        usernameById.set(row.id, row.username)
        profileById.set(row.id, { city: row.city, country: row.country })
      }
    }

    for (const r of raw) {
      const price = effectivePrice(
        r.market_price,
        r.price_override,
        r.price,
        r.manual_price
      )
      const userId = r.binders?.user_id ?? null
      const profile = userId ? profileById.get(userId) : undefined
      const list = byCardId.get(r.card_id) ?? []
      list.push({
        binderCardId: r.id,
        username: userId ? (usernameById.get(userId) ?? null) : null,
        city: profile?.city ?? null,
        country: profile?.country ?? null,
        price,
        currency: r.currency ?? 'USD',
        isForSale: !!r.is_for_sale,
        isForTrade: !!r.is_for_trade,
        image: catalogCardImage(r.set_id, r.number),
        slug: slugify(r.card_name)
      })
      byCardId.set(r.card_id, list)
      count++
      if (r.is_for_sale) saleCount++
      if (r.is_for_trade) tradeCount++
      if (price != null) {
        prices.push(price)
        currency = r.currency ?? currency
      }
    }
  } catch {
    // Sin service key o tabla indisponible: se devuelve el catálogo sin listados.
  }

  return { count, saleCount, tradeCount, minPrice: minPriceOf(prices), currency, byCardId }
}

/** Datos de la página de un set del catálogo. null si no existe. */
export async function getCatalogSetPageData(
  setId: string
): Promise<CatalogSetPageData | null> {
  const sets = await getSets()
  const set = sets.find((s) => s.id === setId)
  if (!set) return null

  const meta = await getCardMetadataMap()
  const cards: RelatedCard[] = []
  for (const c of meta.values()) {
    if (c.setId !== setId) continue
    cards.push({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity ?? null,
      image: catalogCardImage(c.setId, c.number),
      slug: slugify(c.name)
    })
  }
  cards.sort((a, b) => compareNumbers(a.number, b.number))

  const active = await fetchActiveListingsForCardIds(cards.map((c) => c.id))

  // Destacadas: las cartas del set con publicaciones activas o las más raras.
  const activeIds = new Set(active.byCardId.keys())
  const rarityRank = (r: string | null): number => {
    const s = (r ?? '').toLowerCase()
    if (/special illustration|secret|hyper|rainbow|gold/.test(s)) return 5
    if (/ultra|vmax|vstar|illustration/.test(s)) return 4
    if (/double rare|rare holo|radiant|shiny/.test(s)) return 3
    if (/rare/.test(s)) return 2
    if (/uncommon/.test(s)) return 1
    return 0
  }
  const featured = [...cards]
    .sort((a, b) => {
      const av = activeIds.has(a.id)
      const bv = activeIds.has(b.id)
      if (av !== bv) return av ? -1 : 1
      return rarityRank(b.rarity) - rarityRank(a.rarity)
    })
    .slice(0, 12)

  return {
    id: set.id,
    name: set.name,
    series: set.series,
    releaseDate: set.releaseDate ?? null,
    printedTotal: set.printedTotal,
    total: set.total,
    logo: setLogoUrl(set),
    symbol: set.images?.symbol ?? null,
    cardCount: cards.length,
    minPrice: active.minPrice,
    currency: active.currency,
    listingCount: active.count,
    saleCount: active.saleCount,
    tradeCount: active.tradeCount,
    cards,
    featured
  }
}

/** Resuelve una especie por su slug ("pikachu", "charizard-vmax"…). null si no existe. */
export async function getCatalogSpeciesPageData(
  slug: string
): Promise<CatalogSpeciesPageData | null> {
  const meta = await getCardMetadataMap()
  const norm = slug.toLowerCase().replace(/-/g, ' ').trim()
  if (!norm) return null

  const prints: RelatedCard[] = []
  const types = new Set<string>()
  for (const c of meta.values()) {
    if (c.supertype !== 'Pokémon') continue
    const species = speciesFromCardName(c.name)
    if (slugify(species) !== slug && species.toLowerCase() !== norm) continue
    for (const t of c.types ?? []) types.add(t)
    prints.push({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity ?? null,
      image: catalogCardImage(c.setId, c.number),
      slug: slugify(c.name)
    })
  }
  if (prints.length === 0) return null

  prints.sort((a, b) => a.name.localeCompare(b.name))

  const active = await fetchActiveListingsForCardIds(prints.map((p) => p.id))

  const displayName = speciesFromCardName(prints[0].name)

  return {
    slug,
    name: displayName,
    cardCount: prints.length,
    minPrice: active.minPrice,
    currency: active.currency,
    listingCount: active.count,
    saleCount: active.saleCount,
    tradeCount: active.tradeCount,
    prints,
    types: [...types].sort()
  }
}