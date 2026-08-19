import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap, getSets } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { revertExpiredReservations } from '@/lib/claim'
import { effectivePrice } from '@/lib/cardStatus'

export const dynamic = 'force-dynamic'

// Vista pública de UNA carta (deep link desde el marketplace / kit de claim):
// funciona aunque el binder esté privado, porque la carta en venta/cambio es
// pública por sí misma. Con service role porque la RLS oculta cartas de
// binders privados (y acá la que importa está explícitamente listada).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    await revertExpiredReservations(admin)

    const { data: card, error } = await admin
      .from('binder_cards')
      .select(
        `id, binder_id, card_id, card_name, set_id, number, slot_number, market_price,\n         status, price_override, is_for_sale, is_for_trade, price, trade_notes,\n         condition, language, manual_price, currency, is_user_reported, variant, reserved_until,\n         binders!binder_cards_binder_id_fkey!inner(id, title, is_public, user_id)`
      )
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!card) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    // Solo las cartas listadas (venta/cambio) son públicas; una carta de
    // colección de un binder privado nunca se expone por id.
    if (!card.is_for_sale && !card.is_for_trade) {
      return NextResponse.json({ error: 'Carta no publicada' }, { status: 404 })
    }

    const binder = Array.isArray(card.binders) ? card.binders[0] : card.binders
    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
    }

    const { data: owner } = await admin
      .from('profiles')
      .select('id, username, whatsapp_number, country, city')
      .eq('id', binder.user_id)
      .maybeSingle()

    const [meta, sets] = await Promise.all([getCardMetadataMap(), getSets()])
    const m = meta.get(card.card_id)
    const set_name = sets.find((s) => s.id === card.set_id)?.name ?? card.set_id

    return NextResponse.json({
      card: {
        id: card.id,
        card_id: card.card_id,
        card_name: card.card_name,
        set_id: card.set_id,
        set_name,
        number: card.number,
        rarity: m?.rarity ?? null,
        variant: card.variant ?? 'normal',
        supertype: m?.supertype ?? null,
        subtypes: m?.subtypes ?? null,
        types: m?.types ?? null,
        status: card.status,
        condition: card.condition ?? null,
        language: card.language ?? null,
        is_for_sale: card.is_for_sale,
        is_for_trade: card.is_for_trade,
        trade_notes: card.trade_notes ?? null,
        reserved_until: card.reserved_until ?? null,
        price: effectivePrice(card.market_price, card.price_override, card.price, card.manual_price),
        manual_price: card.manual_price ?? null,
        currency: card.currency ?? 'USD',
        is_user_reported: card.is_user_reported ?? false,
        image: await resolveCardImage(card.set_id, card.number, card.language)
      },
      binder: { id: binder.id, title: binder.title, is_public: binder.is_public },
      owner: owner
        ? {
            id: owner.id,
            username: owner.username,
            whatsapp_number: owner.whatsapp_number,
            country: owner.country,
            city: owner.city
          }
        : null
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
