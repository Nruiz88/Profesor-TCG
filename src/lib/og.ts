// ============================================================================
// Datos para Open Graph (og:image / og:title / og:description)
// ============================================================================
// Helpers server-side que alimentan las imágenes generadas con @vercel/og y
// los metadatos de las páginas públicas (binder por username, binder por id y
// carta). Espejan la lógica de las APIs públicas (/api/public/*) pero
// devuelven solo lo que necesita el preview compartido en WhatsApp/redes.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { resolveCardImage } from '@/lib/cardImage'
import { effectivePrice } from '@/lib/cardStatus'
import { getSets } from '@/lib/catalog'

export interface OgBinderData {
  title: string
  username: string | null
  cardCount: number
  totalValue: number
  /** Imagen de portada del binder (cover_card_id o primera carta). */
  coverImage: string | null
  coverCardName: string | null
}

export interface OgCardData {
  name: string
  setId: string
  set_name: string
  number: string
  price: number | null
  currency: string
  image: string
  username: string | null
  isReserved: boolean
}

interface BinderCardRow {
  id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  slot_number: number
  market_price: number | null
  price_override?: number | null
  price?: number | null
}

// Portada: la carta configurada como cover_card_id, o la primera por slot.
type SsrClient = Awaited<ReturnType<typeof createClient>>

async function pickCover(
  supabase: SsrClient,
  binderId: string,
  cards: BinderCardRow[]
): Promise<{ image: string | null; cardName: string | null }> {
  if (cards.length === 0) return { image: null, cardName: null }

  const { data: binder } = await supabase
    .from('binders')
    .select('cover_card_id')
    .eq('id', binderId)
    .maybeSingle()

  const coverId = binder?.cover_card_id ?? null
  const cover =
    (coverId ? cards.find((c) => c.id === coverId) : undefined) ?? cards[0]
  return {
    image: await resolveCardImage(cover.set_id, cover.number),
    cardName: cover.card_name
  }
}

// Datos para el OG de un binder público (resuelto por username o por id).
export async function getBinderOgData(
  by: { username: string } | { binderId: string }
): Promise<OgBinderData | null> {
  const supabase = await createClient()

  let binderId: string | null = null
  let ownerUsername: string | null = null

  if ('username' in by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', by.username.toLowerCase())
      .maybeSingle()
    if (!profile) return null
    ownerUsername = profile.username
    const { data: binder } = await supabase
      .from('binders')
      .select('id')
      .eq('user_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    binderId = binder?.id ?? null
  } else {
    const { data: binder } = await supabase
      .from('binders')
      .select('id, user_id')
      .eq('id', by.binderId)
      .eq('is_public', true)
      .maybeSingle()
    if (!binder) return null
    binderId = binder.id
    const { data: owner } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', binder.user_id)
      .maybeSingle()
    ownerUsername = owner?.username ?? null
  }

  if (!binderId) return null

  const { data: binder } = await supabase
    .from('binders')
    .select('id, title')
    .eq('id', binderId)
    .maybeSingle()
  if (!binder) return null

  const { data: cards } = await supabase
    .from('binder_cards')
    .select(
      'id, card_id, card_name, set_id, number, slot_number, market_price, price_override, price'
    )
    .eq('binder_id', binderId)
    .order('slot_number', { ascending: true })
  const rows = (cards ?? []) as BinderCardRow[]

  const cover = await pickCover(supabase, binderId, rows)

  return {
    title: binder.title ?? 'Mi Binder',
    username: ownerUsername,
    cardCount: rows.length,
    // Mismo cálculo que el header de la página pública (computeTotalValue)
    totalValue: rows.reduce((sum, c) => sum + (c.market_price ?? 0), 0),
    coverImage: cover.image,
    coverCardName: cover.cardName
  }
}

// Datos para el OG de una carta pública (venta/cambio, puede ser de un binder
// privado). Con service role, como /api/public/cards/[id].
export async function getCardOgData(cardId: string): Promise<OgCardData | null> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return null
  const admin = createAdminClient(url, serviceKey)

  const { data: card, error } = await admin
    .from('binder_cards')
    .select(
      `id, binder_id, card_id, card_name, set_id, number, status, reserved_until,
       market_price, price_override, is_for_sale, is_for_trade, price, manual_price,
       currency, is_user_reported,
       binders!binder_cards_binder_id_fkey!inner(id, user_id)`
    )
    .eq('id', cardId)
    .maybeSingle()
  if (error || !card) return null
  if (!card.is_for_sale && !card.is_for_trade) return null

  const binder = Array.isArray(card.binders) ? card.binders[0] : card.binders
  if (!binder) return null

  const { data: owner } = await admin
    .from('profiles')
    .select('username')
    .eq('id', binder.user_id)
    .maybeSingle()

  const sets = await getSets()
  const set_name = sets.find((s) => s.id === card.set_id)?.name ?? card.set_id

  return {
    name: card.card_name,
    setId: card.set_id,
    set_name,
    number: card.number,
    price: effectivePrice(card.market_price, card.price_override, card.price),
    currency: card.currency ?? 'USD',
    image: await resolveCardImage(card.set_id, card.number),
    username: owner?.username ?? null,
    isReserved: card.status === 'reserved'
  }
}
