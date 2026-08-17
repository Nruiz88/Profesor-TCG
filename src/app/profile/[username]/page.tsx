import { notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { countCatalogPokemonSpecies, getCardMetadataMap, getSets } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { speciesFromCardName } from '@/lib/pokedex'
import { effectivePrice } from '@/lib/cardStatus'
import { findWantlistMatches } from '@/lib/matchmaking'
import UserProfileView, { type ProfileReview } from '@/components/profile/UserProfileView'
import type { ExploreCard } from '@/app/api/public/explore/route'
import type { WantlistCard } from '@/types/wantlist'

export const dynamic = 'force-dynamic'

// Cliente mínimo compatible con el cliente RLS y el de service role (ambos
// exponen .from(table) con la misma cadena) — patrón de explore/route.
type QueryClient = {
  from: (table: string) => any
}

interface Reputation {
  ratingAvg: number | null
  reviewCount: number
  completedClaims: number
  isVerified: boolean
}

async function loadReputation(
  admin: QueryClient,
  profileId: string
): Promise<Reputation> {
  const [{ data: reviewRows }, { count: completedClaims }] = await Promise.all([
    admin.from('reviews').select('rating').eq('reviewed_user_id', profileId),
    admin
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .or(`seller_id.eq.${profileId},buyer_id.eq.${profileId}`)
      .eq('status', 'completed')
  ])

  const ratings = (reviewRows || []).map((r: { rating: number }) => r.rating)
  return {
    ratingAvg:
      ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null,
    reviewCount: ratings.length,
    completedClaims: completedClaims ?? 0,
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
      image: await resolveCardImage(r.set_id, r.number),
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

  const [rep, saleCards, wantlist, reviews, pokedex] = await Promise.all([
    loadReputation(admin, profile.id),
    loadSaleCards(admin, profile, binders || []),
    loadWantlist(admin, profile.id),
    loadReviews(admin, profile.id),
    loadPokedex(admin, binderIds)
  ])

  const enrichedSaleCards: ExploreCard[] = saleCards.map((c) => ({
    ...c,
    ratingAvg: rep.ratingAvg,
    reviewCount: rep.reviewCount,
    isVerified: rep.isVerified || !!profile.is_verified
  }))

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
    />
  )
}
