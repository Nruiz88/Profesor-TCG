import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getProfileOgData } from '@/lib/og'
import { countCatalogPokemonSpecies, getCardMetadataMap, getSets } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { speciesFromCardName } from '@/lib/pokedex'
import { effectivePrice } from '@/lib/cardStatus'
import { findWantlistMatches } from '@/lib/matchmaking'
import { computeTrainerScore } from '@/lib/trainer'
import UserProfileView, { type ProfileReview } from '@/components/profile/UserProfileView'
import type { ExploreCard } from '@/app/api/public/explore/route'
import type { WantlistCard } from '@/types/wantlist'

export const dynamic = 'force-dynamic'

// Metadata dinámica del perfil público (og:title/description para WhatsApp)
export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const data = await getProfileOgData(username)
  if (!data) {
    return { title: 'Perfil · Profesor TCG' }
  }
  const title = `@${data.username} · Profesor TCG`
  const stats = [
    data.ratingAvg != null ? `★ ${data.ratingAvg.toFixed(1)} (${data.reviewCount})` : 'Sin reseñas',
    `${data.completedClaims} transacciones`,
    `${data.totalCards} cartas en el binder`
  ].join(' · ')
  const wants =
    data.wantlistCount > 0
      ? ` Busca ${data.wantlistCount} carta${data.wantlistCount !== 1 ? 's' : ''}.`
      : ''
  const description = `${stats}.${wants} ${data.city || data.country ? `Ubicado en ${[data.city, data.country].filter(Boolean).join(', ')}. ` : ''}Coleccionista de Profesor TCG — conocé su colección y coordina por WhatsApp.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile'
    }
  }
}

// Cliente mínimo compatible con el cliente RLS y el de service role (ambos
// exponen .from(table) con la misma cadena) — patrón de explore/route.
type QueryClient = {
  from: (table: string) => any
}

interface Reputation {
  ratingAvg: number | null
  reviewCount: number
  completedClaims: number
  /** Ventas completadas como vendedor (kind sale/both). */
  completedSales: number
  /** Cambios completados como vendedor (kind trade/both). */
  completedTrades: number
  /** Compras completadas como comprador. */
  completedBuys: number
  isVerified: boolean
}

async function loadReputation(
  admin: QueryClient,
  profileId: string
): Promise<Reputation> {
  const [{ data: reviewRows }, { data: completedRows }] = await Promise.all([
    admin.from('reviews').select('rating').eq('reviewed_user_id', profileId),
    admin
      .from('claims')
      .select('kind, buyer_id, seller_id')
      .or(`seller_id.eq.${profileId},buyer_id.eq.${profileId}`)
      .eq('status', 'completed')
      .limit(1000)
  ])

  const ratings = (reviewRows || []).map((r: { rating: number }) => r.rating)

  // Desglose por rol/tipo para el score de entrenador
  let completedSales = 0
  let completedTrades = 0
  let completedBuys = 0
  for (const c of completedRows || []) {
    const row = c as { kind: string; buyer_id: string; seller_id: string }
    if (row.seller_id === profileId) {
      if (row.kind === 'sale' || row.kind === 'both') completedSales++
      if (row.kind === 'trade' || row.kind === 'both') completedTrades++
    }
    if (row.buyer_id === profileId) completedBuys++
  }

  return {
    ratingAvg:
      ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
    reviewCount: ratings.length,
    completedClaims: (completedRows || []).length,
    completedSales,
    completedTrades,
    completedBuys,
    isVerified: false
  }
}

// Cartas en venta / trade del usuario, normalizadas al contrato ExploreCard
// para renderizarlas con MarketCard (mismo shape que el marketplace).
async function loadSaleCards(
  admin: QueryClient,
  profile: { id: string; username: string; city: string | null; country: string | null; whatsapp_number: string | null },
  binders: { id: string; is_public: boolean }[]
): Promise<ExploreCard[]> {
  if (!binders || binders.length === 0) return []
  const binderIds = binders.map((b: { id: string }) => b.id)

  const { data: rows } = await admin
    .from('binder_cards')
    .select(
      'id, binder_id, card_id, card_name, set_id, number, market_price, status, price_override, is_for_sale, is_for_trade, price, language, manual_price, currency, is_user_reported, updated_at'
    )
    .in('binder_id', binderIds)
    .or('is_for_sale.eq.true,is_for_trade.eq.true')
    .order('updated_at', { ascending: false })
    .limit(120)
  if (!rows || rows.length === 0) return []

  const meta = await getCardMetadataMap()
  const sets = await getSets()
  const setNameById = new Map(sets.map((s) => [s.id, s.name]))
  const binderPublic = binders.some((b: { is_public: boolean }) => b.is_public)

  return Promise.all(
    rows.map(async (r: any) => ({
      id: r.id,
      binder_id: r.binder_id,
      card_id: r.card_id,
      card_name: r.card_name,
      set_id: r.set_id,
      set_name: setNameById.get(r.set_id) ?? r.set_id,
      number: r.number,
      rarity: meta.get(r.card_id)?.rarity ?? null,
      language: r.language ?? null,
      currency: r.currency ?? 'USD',
      is_user_reported: r.is_user_reported ?? false,
      status: r.is_for_sale ? 'for_sale' : 'for_trade',
      price: effectivePrice(r.market_price, r.price_override, r.price),
      image: await resolveCardImage(r.set_id, r.number, r.language),
      username: profile.username,
      city: profile.city,
      country: profile.country,
      whatsapp_number: profile.whatsapp_number,
      ratingAvg: null,
      reviewCount: 0,
      isVerified: false,
      binder_public: binderPublic,
      updated_at: r.updated_at
    }))
  )
}

async function loadWantlist(
  admin: QueryClient,
  profileId: string
): Promise<WantlistCard[]> {
  const { data } = await admin
    .from('wantlist_cards')
    .select('id, card_id, card_name, set_id, set_name, number, max_budget, currency')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })

  const meta = await getCardMetadataMap()
  return Promise.all(
    (data || []).map(async (w: any) => {
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
}

// Pokédex del usuario: especies de Pokémon distintas en todos sus binders,
// contra el total de especies del catálogo. Cosmético, se luce en el perfil.
async function loadPokedex(
  admin: QueryClient,
  binderIds: string[]
): Promise<{ captured: number; total: number } | null> {
  if (binderIds.length === 0) return null
  try {
    const { data: rows } = await admin
      .from('binder_cards')
      .select('card_id')
      .in('binder_id', binderIds)

    const meta = await getCardMetadataMap()
    const species = new Set<string>()
    for (const r of rows || []) {
      const m = meta.get(r.card_id)
      // Solo cuentan cartas de Pokémon (no entrenadores ni energía)
      if (m && m.supertype === 'Pokémon') {
        species.add(speciesFromCardName(m.name))
      }
    }

    const total = await countCatalogPokemonSpecies()
    return { captured: species.size, total }
  } catch {
    return null
  }
}

// Showcase: las 4 cartas más caras del binder del usuario, para mostrar
// como tarjetas destacadas en la parte superior del perfil (tipo pkmn.gg).
async function loadShowcaseCards(
  admin: QueryClient,
  profile: { id: string; username: string; city: string | null; country: string | null; whatsapp_number: string | null },
  binders: { id: string; is_public: boolean }[]
): Promise<ExploreCard[]> {
  if (!binders || binders.length === 0) return []
  const binderIds = binders.map((b: { id: string }) => b.id)

  const { data: rows } = await admin
    .from('binder_cards')
    .select(
      'id, binder_id, card_id, card_name, set_id, number, market_price, status, price_override, is_for_sale, is_for_trade, price, language, manual_price, currency, is_user_reported, updated_at'
    )
    .in('binder_id', binderIds)
    .order('market_price', { ascending: false })
    .limit(4)
  if (!rows || rows.length === 0) return []

  const meta = await getCardMetadataMap()
  const sets = await getSets()
  const setNameById = new Map(sets.map((s) => [s.id, s.name]))
  const binderPublic = binders.some((b: { is_public: boolean }) => b.is_public)

  return Promise.all(
    rows.map(async (r: any) => ({
      id: r.id,
      binder_id: r.binder_id,
      card_id: r.card_id,
      card_name: r.card_name,
      set_id: r.set_id,
      set_name: setNameById.get(r.set_id) ?? r.set_id,
      number: r.number,
      rarity: meta.get(r.card_id)?.rarity ?? null,
      language: r.language ?? null,
      currency: r.currency ?? 'USD',
      is_user_reported: r.is_user_reported ?? false,
      status: r.is_for_sale ? 'for_sale' : 'for_trade',
      price: effectivePrice(r.market_price, r.price_override, r.price),
      image: await resolveCardImage(r.set_id, r.number, r.language),
      username: profile.username,
      city: profile.city,
      country: profile.country,
      whatsapp_number: profile.whatsapp_number,
      ratingAvg: null,
      reviewCount: 0,
      isVerified: false,
      binder_public: binderPublic,
      updated_at: r.updated_at
    }))
  )
}

// Colección del usuario agrupada por set: para cada set que tiene cartas,
// muestra cuántas tiene vs el total del set (para la pestaña Colección).
interface SetCollection {
  setId: string
  setName: string
  series: string
  owned: number
  total: number
  percentage: number
}

async function loadCollectionBySet(
  admin: QueryClient,
  binderIds: string[]
): Promise<SetCollection[]> {
  if (binderIds.length === 0) return []
  try {
    const { data: rows } = await admin
      .from('binder_cards')
      .select('set_id')
      .in('binder_id', binderIds)

    if (!rows || rows.length === 0) return []

    // Contar cartas únicas por set (un usuario puede tener duplicados en
    // distintos binders, pero para el progreso contamos cartas únicas por
    // número dentro de cada set)
    const { data: uniqueRows } = await admin
      .from('binder_cards')
      .select('set_id, number')
      .in('binder_id', binderIds)

    const ownedBySet = new Map<string, Set<string>>()
    for (const r of uniqueRows || []) {
      if (!ownedBySet.has(r.set_id)) ownedBySet.set(r.set_id, new Set())
      ownedBySet.get(r.set_id)!.add(r.number)
    }

    const sets = await getSets()
    const setMeta = new Map(sets.map((s) => [s.id, s]))

    const result: SetCollection[] = []
    for (const [setId, numbers] of ownedBySet) {
      const meta = setMeta.get(setId)
      const total = meta?.total || meta?.printedTotal || numbers.size
      const percentage = total > 0 ? Math.round((numbers.size / total) * 100) : 0
      result.push({
        setId,
        setName: meta?.name ?? setId,
        series: meta?.series ?? '',
        owned: numbers.size,
        total,
        percentage
      })
    }

    // Ordenar: mayor porcentaje primero, luego por cantidad de cartas
    result.sort((a, b) => b.percentage - a.percentage || b.owned - a.owned)
    return result
  } catch {
    return []
  }
}

async function loadReviews(
  admin: QueryClient,
  profileId: string
): Promise<ProfileReview[]> {
  const { data } = await admin
    .from('reviews')
    .select(
      'id, rating, tags, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, username), claim:claims!reviews_claim_id_fkey(kind)'
    )
    .eq('reviewed_user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50)

  return (data || []).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    tags: r.tags ?? [],
    comment: r.comment,
    createdAt: r.created_at,
    kind: r.claim && !Array.isArray(r.claim) ? r.claim.kind : null,
    reviewer:
      r.reviewer && !Array.isArray(r.reviewer)
        ? { id: r.reviewer.id, username: r.reviewer.username }
        : null
  }))
}

export default async function UserProfilePage({
  params
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    notFound()
  }
  const admin: QueryClient = createAdminClient(url, serviceKey)

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, username, whatsapp_number, country, city, is_verified, created_at')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  if (!profile) notFound()

  const { data: binders } = await admin
    .from('binders')
    .select('id, is_public')
    .eq('user_id', profile.id)
  const binderIds = (binders || []).map((b: { id: string }) => b.id)

  const [rep, saleCards, wantlist, reviews, pokedex, collectionBySet, showcaseCards] = await Promise.all([
    loadReputation(admin, profile.id),
    loadSaleCards(admin, profile, binders || []),
    loadWantlist(admin, profile.id),
    loadReviews(admin, profile.id),
    loadPokedex(admin, binderIds),
    loadCollectionBySet(admin, binderIds),
    loadShowcaseCards(admin, profile, binders || [])
  ])

  const enrichedSaleCards: ExploreCard[] = saleCards.map((c) => ({
    ...c,
    ratingAvg: rep.ratingAvg,
    reviewCount: rep.reviewCount,
    isVerified: rep.isVerified || !!profile.is_verified
  }))

  // Puntos de Entrenador: XP unificada que se luce en el perfil público
  const trainerScore = computeTrainerScore({
    capturedSpecies: pokedex?.captured ?? 0,
    completedSales: rep.completedSales,
    completedTrades: rep.completedTrades,
    completedBuys: rep.completedBuys,
    reviewCount: rep.reviewCount
  })

  // Matchmaking: si el visitante tiene en su binder cartas que el usuario del
  // perfil busca, mostramos el banner "¡Oportunidad de Match!".
  let matchCount = 0
  if (user && user.id !== profile.id) {
    try {
      matchCount = (await findWantlistMatches(profile.id, user.id, admin)).length
    } catch {
      matchCount = 0
    }
  }

  return (
    <UserProfileView
      profile={{
        id: profile.id,
        username: profile.username,
        whatsapp_number: profile.whatsapp_number,
        city: profile.city,
        country: profile.country,
        isVerified: rep.isVerified || !!profile.is_verified,
        created_at: profile.created_at
      }}
      ratingAvg={rep.ratingAvg}
      reviewCount={rep.reviewCount}
      completedClaims={rep.completedClaims}
      saleCards={enrichedSaleCards}
      wantlist={wantlist}
      reviews={reviews}
      matchCount={matchCount}
      isOwnProfile={user?.id === profile.id}
      pokedex={pokedex}
      trainerScore={trainerScore}
      collectionBySet={collectionBySet}
      showcaseCards={showcaseCards}
    />
  )
}
