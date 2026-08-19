import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCardMetadataMap, getSets } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { validate, extractParams } from '@/lib/validate'
import { binderSchema } from '@/lib/schemas'
import { apiLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const rl = apiLimit(req)
  if (rl.limited) return rl.response!

  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const params = validate(binderSchema, extractParams(req))
    if (params.error) return params.error
    const { binderId, all } = params.data

    let binder: { id: string; title: string; is_public: boolean } | null = null

    if (all === '1') {
      // Todas las cartas del usuario a través de sus binders (para proponer cambios)
      const { data: binders } = await supabase
        .from('binders')
        .select('id')
        .eq('user_id', user.id)
      const ids = (binders || []).map((b) => b.id)
      if (ids.length === 0) {
        return NextResponse.json({ cards: [] })
      }
      const { data: cards, error } = await supabase
        .from('binder_cards')
        .select(
          'id, binder_id, card_id, card_name, set_id, number, slot_number, market_price, status, price_override, is_for_sale, is_for_trade, price, trade_notes, condition, language, manual_price, currency, is_user_reported, is_featured'
        )
        .in('binder_id', ids)
        .order('slot_number', { ascending: true })
      if (error) throw error

      const meta = await getCardMetadataMap()
      const sets = await getSets()
      const setNameById = new Map(sets.map((s) => [s.id, s.name]))
      const enriched = await Promise.all(
        (cards || []).map(async (c) => {
          const m = meta.get(c.card_id)
          return {
            ...c,
            rarity: m?.rarity ?? null,
            supertype: m?.supertype ?? null,
            subtypes: m?.subtypes ?? null,
            types: m?.types ?? null,
            set_name: setNameById.get(c.set_id) ?? c.set_id,
            image: await resolveCardImage(c.set_id, c.number, c.language)
          }
        })
      )
      return NextResponse.json({ cards: enriched })
    }

    const BINDER_SELECT = 'id, title, description, is_public, cover_card_id, created_at'

    if (binderId) {
      const { data } = await supabase
        .from('binders')
        .select(BINDER_SELECT)
        .eq('id', binderId)
        .eq('user_id', user.id)
        .maybeSingle()
      binder = data ?? null
      if (!binder) {
        return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
      }
    } else {
      // Aseguramos el binder del usuario autenticado: el más antiguo (mismo
      // orden que getUserBinders, que lista las carpetas por created_at asc)
      const { data: existing } = await supabase
        .from('binders')
        .select(BINDER_SELECT)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1)
      let b = existing?.[0] ?? null

      if (!b) {
        const { data: created, error: createError } = await supabase
          .from('binders')
          .insert({ title: 'Mi Colección', user_id: user.id })
          .select(BINDER_SELECT)
          .single()
        if (createError) throw createError
        b = created
      }
      binder = b
    }

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select(
        'id, binder_id, card_id, card_name, set_id, number, slot_number, market_price, status, price_override, is_for_sale, is_for_trade, price, trade_notes, condition, language, manual_price, currency, is_user_reported, is_featured'
      )
      .eq('binder_id', binder.id)
      .order('slot_number', { ascending: true })
    if (error) throw error

    // Enriquecer con metadata del catálogo para el render de la carta (rarity, subtypes, etc.)
    const meta = await getCardMetadataMap()
    const sets = await getSets()
    const setNameById = new Map(sets.map((s) => [s.id, s.name]))
    const enriched = await Promise.all(
      (cards || []).map(async (c) => {
        const m = meta.get(c.card_id)
        return {
          ...c,
          rarity: m?.rarity ?? null,
          supertype: m?.supertype ?? null,
          subtypes: m?.subtypes ?? null,
          types: m?.types ?? null,
          set_name: setNameById.get(c.set_id) ?? c.set_id,
          // pokemontcg.io sirve el reverso de la carta en lugar de 404 limpio:
          // resolvemos la imagen real o un placeholder "Sin imagen"
          image: await resolveCardImage(c.set_id, c.number, c.language)
        }
      })
    )

    return NextResponse.json({
      binder,
      cards: enriched
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: {
    binderId?: string
    title?: unknown
    description?: unknown
    is_public?: boolean
    cover_card_id?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.binderId) {
    return NextResponse.json({ error: 'Falta binderId' }, { status: 400 })
  }

  try {
    const { data: binder } = await supabase
      .from('binders')
      .select('id, title, description, is_public, cover_card_id')
      .eq('id', body.binderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado' }, { status: 404 })
    }

    const updates: Record<string, string | boolean | null> = {}

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json({ error: 'El título no puede estar vacío' }, { status: 400 })
      }
      updates.title = body.title.trim().slice(0, 60)
    }

    if (body.description !== undefined) {
      if (body.description === null) {
        updates.description = null
      } else if (typeof body.description === 'string') {
        updates.description = body.description.trim() === '' ? null : body.description.trim().slice(0, 300)
      } else {
        return NextResponse.json({ error: 'Descripción inválida' }, { status: 400 })
      }
    }

    if (body.is_public !== undefined) {
      updates.is_public = !!body.is_public
    }

    // Portada: debe ser una carta del propio binder
    if (body.cover_card_id !== undefined) {
      if (body.cover_card_id === null || body.cover_card_id === '') {
        updates.cover_card_id = null
      } else {
        const { data: cover } = await supabase
          .from('binder_cards')
          .select('id')
          .eq('id', body.cover_card_id)
          .eq('binder_id', binder.id)
          .maybeSingle()
        if (!cover) {
          return NextResponse.json(
            { error: 'La carta de portada no pertenece a este binder' },
            { status: 400 }
          )
        }
        updates.cover_card_id = body.cover_card_id as string
      }
    }

    const { data, error } = await supabase
      .from('binders')
      .update(updates)
      .eq('id', binder.id)
      .select('id, title, description, is_public, cover_card_id, created_at')
      .single()
    if (error) throw error

    return NextResponse.json({ binder: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}