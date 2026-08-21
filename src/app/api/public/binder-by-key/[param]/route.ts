import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCardMetadataMap } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { revertExpiredReservations } from '@/lib/claim'

export const dynamic = 'force-dynamic'

// Resuelve un binder público por su clave corta: /b/<slug> o /b/<uuid>.
// Primero intenta por slug (URL corta) y, si no existe, cae al binderId
// (compatibilidad con links antiguos /b/<uuid>).
export async function GET(_req: Request, { params }: { params: Promise<{ param: string }> }) {
  const { param } = await params
  const key = param.trim()
  const supabase = await createClient()

  try {
    // Revertir soft locks de 24h vencidos (service role), throttled a 5 min.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (serviceKey && url) {
      await revertExpiredReservations(createAdminClient(url, serviceKey), {
        minIntervalMs: 5 * 60 * 1000
      })
    }

    // RLS: solo devuelve binders con is_public = true (visitantes anónimos)
    let binder: { id: string; title: string; user_id: string } | null = null

    // 1) Por slug (URL corta)
    const { data: bySlug } = await supabase
      .from('binders')
      .select('id, title, user_id')
      .eq('slug', key.toLowerCase())
      .eq('is_public', true)
      .maybeSingle()
    binder = bySlug ?? null

    // 2) Fallback por binderId (links antiguos /b/<uuid>)
    if (!binder) {
      const { data: byId } = await supabase
        .from('binders')
        .select('id, title, user_id')
        .eq('id', key)
        .eq('is_public', true)
        .maybeSingle()
      binder = byId ?? null
    }

    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado o privado' }, { status: 404 })
    }

    // Perfil del dueño para el badge del vendedor (solo campos públicos)
    const { data: owner } = await supabase
      .from('profiles')
      .select('id, username, whatsapp_number, country, city')
      .eq('id', binder.user_id)
      .maybeSingle()

    // Wantlist del dueño (pública por RLS) para la pestaña "Cartas Buscadas"
    const { data: wantlist, error: wantlistError } = await supabase
      .from('wantlist_cards')
      .select('id, card_id, card_name, set_id, set_name, number, max_budget, currency')
      .eq('user_id', binder.user_id)
      .order('created_at', { ascending: false })
    if (wantlistError) throw wantlistError

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select(
        'id, binder_id, card_id, card_name, set_id, number, slot_number, market_price, status, price_override, is_for_sale, is_for_trade, price, trade_notes, condition, language, manual_price, currency, is_user_reported, reserved_until, quantity'
      )
      .eq('binder_id', binder.id)
      .order('slot_number', { ascending: true })
    if (error) throw error

    // Enriquecer con metadata del catálogo para el render de la carta (rarity, subtypes, etc.)
    const meta = await getCardMetadataMap()
    const enriched = await Promise.all(
      (cards || []).map(async (c) => {
        const m = meta.get(c.card_id)
        return {
          ...c,
          rarity: m?.rarity ?? null,
          supertype: m?.supertype ?? null,
          subtypes: m?.subtypes ?? null,
          types: m?.types ?? null,
          // pokemontcg.io sirve el reverso de la carta en lugar de 404 limpio:
          // resolvemos la imagen real o un placeholder "Sin imagen"
          image: await resolveCardImage(c.set_id, c.number, c.language)
        }
      })
    )

    const wantlistEnriched = await Promise.all(
      (wantlist || []).map(async (w) => {
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

    return NextResponse.json(
      {
        binder: { id: binder.id, title: binder.title, slug: key.toLowerCase() },
        owner,
        cards: enriched,
        wantlist: wantlistEnriched
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600'
        }
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
