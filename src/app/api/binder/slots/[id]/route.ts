import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  availabilityToFlags,
  isAvailability,
  isCardStatus,
  statusFromAvailability
} from '@/lib/cardStatus'
import { isCardLanguage } from '@/lib/cardLanguage'
import { isCurrency } from '@/lib/priceGuide'
import { effectivePrice } from '@/lib/cardStatus'
import { notifyWantlistMatches } from '@/lib/notifications'
import { sendDiscordWebhook } from '@/lib/discord'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // RLS: solo permite borrar la fila si el binder pertenece al usuario.
    // Si la carta tiene más de una copia (quantity > 1), quitamos una copia
    // (decrementamos) en vez de borrar el bolsillo entero.
    const { data: row } = await supabase
      .from('binder_cards')
      .select('id, quantity')
      .eq('id', id)
      .maybeSingle()
    if (!row) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    if ((row.quantity ?? 1) > 1) {
      const { error } = await supabase
        .from('binder_cards')
        .update({ quantity: (row.quantity ?? 1) - 1, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true, decremented: true, quantity: (row.quantity ?? 1) - 1 })
    }

    const { error } = await supabase.from('binder_cards').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface PatchBody {
  status?: unknown
  price_override?: unknown
  availability?: unknown
  price?: unknown
  manual_price?: unknown
  currency?: unknown
  trade_notes?: unknown
  condition?: unknown
  language?: unknown
  is_featured?: unknown
  variant?: unknown
  quantity?: unknown
}

// Actualizar la modalidad de disponibilidad (availability), el precio manual y
// las notas de intercambio de una carta del binder propio. RLS impide tocar
// cartas de otros usuarios. Se mantienen sincronizados status (derivado) y
// price_override (legacy) para el resto de la app.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: PatchBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const updates: Record<string, string | number | boolean | null> = {}

  // Modalidad de disponibilidad -> flags + status derivado (legacy)
  if (body.availability !== undefined) {
    if (!isAvailability(body.availability)) {
      return NextResponse.json({ error: 'Modalidad inválida' }, { status: 400 })
    }
    const flags = availabilityToFlags(body.availability)
    updates.is_for_sale = flags.isForSale
    updates.is_for_trade = flags.isForTrade
    updates.status = statusFromAvailability(body.availability)
  }

  // Precio manual: tanto `price` (formulario clásico) como `manual_price`
  // (carga manual con guía externa) convergen acá. Se sincronizan
  // price/price_override (legacy) y manual_price, y se marca
  // is_user_reported = true para distinguirlo del valor automático.
  const applyManualPrice = (value: unknown): string | null => {
    if (value === null || value === '') {
      updates.price = null
      updates.price_override = null
      updates.manual_price = null
      updates.is_user_reported = false
      return null
    }
    const num = Number(value)
    if (!Number.isFinite(num) || num < 0 || num > 999999) {
      return 'Precio inválido'
    }
    const rounded = Math.round(num * 100) / 100
    updates.price = rounded
    updates.price_override = rounded
    updates.manual_price = rounded
    updates.is_user_reported = true
    return null
  }

  if (body.price !== undefined) {
    const err = applyManualPrice(body.price)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  if (body.manual_price !== undefined) {
    const err = applyManualPrice(body.manual_price)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  // Moneda del precio manual (USD por defecto)
  if (body.currency !== undefined) {
    if (!isCurrency(body.currency)) {
      return NextResponse.json({ error: 'Moneda inválida' }, { status: 400 })
    }
    updates.currency = body.currency
  }

  // Notas de intercambio ("¿Qué busco a cambio?")
  if (body.trade_notes !== undefined) {
    const v = body.trade_notes
    if (v === null) {
      updates.trade_notes = null
    } else if (typeof v === 'string') {
      updates.trade_notes = v.trim() === '' ? null : v.trim().slice(0, 500)
    } else {
      return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })
    }
  }

  // Condición física de la carta (Mint / Near Mint / Excellent / …)
  if (body.condition !== undefined) {
    const v = body.condition
    if (v === null || v === '') {
      updates.condition = null
    } else if (typeof v === 'string') {
      updates.condition = v.trim().slice(0, 40)
    } else {
      return NextResponse.json({ error: 'Condición inválida' }, { status: 400 })
    }
  }

  // Idioma de la copia física de la carta
  if (body.language !== undefined) {
    if (!isCardLanguage(body.language)) {
      return NextResponse.json({ error: 'Idioma inválido' }, { status: 400 })
    }
    updates.language = body.language
  }

  // Variante de la carta (normal, holo, reverse_holo, etc.)
  if (body.variant !== undefined) {
    const v = body.variant
    if (v === null || v === '' || v === 'normal') {
      updates.variant = 'normal'
    } else if (typeof v === 'string') {
      updates.variant = v.trim().slice(0, 30)
    } else {
      return NextResponse.json({ error: 'Variante inválida' }, { status: 400 })
    }
  }

  // Carta destacada en el perfil (máximo 4 por usuario)
  if (body.is_featured !== undefined) {
    const isFeatured = body.is_featured === true || body.is_featured === 'true'
    if (isFeatured) {
      // Contar cuántas cartas destacadas tiene el usuario en todos sus binders
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()
      if (profile) {
        const { data: binders } = await supabase
          .from('binders')
          .select('id')
          .eq('user_id', user.id)
        if (binders && binders.length > 0) {
          const binderIds = binders.map((b: { id: string }) => b.id)
          const { count } = await supabase
            .from('binder_cards')
            .select('*', { count: 'exact', head: true })
            .in('binder_id', binderIds)
            .eq('is_featured', true)
          if (count && count >= 4) {
            return NextResponse.json(
              { error: 'Máximo 4 cartas destacadas. Quitá una antes de agregar otra.' },
              { status: 400 }
            )
          }
        }
      }
    }
    updates.is_featured = isFeatured
  }

  // Cantidad de copias de la carta en el bolsillo (mínimo 1)
  if (body.quantity !== undefined) {
    const num = Number(body.quantity)
    if (!Number.isInteger(num) || num < 1 || num > 999) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }
    updates.quantity = num
  }

  // Backwards-compat: el body viejo seguía enviando status / price_override
  if (body.status !== undefined) {
    if (!isCardStatus(body.status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body.price_override !== undefined && body.price === undefined) {
    const v = body.price_override
    if (v === null || v === '') {
      updates.price_override = null
    } else {
      const num = Number(v)
      if (!Number.isFinite(num) || num < 0 || num > 999999) {
        return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
      }
      updates.price_override = Math.round(num * 100) / 100
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('binder_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(
        'id, card_id, card_name, set_id, number, status, price_override, market_price, is_for_sale, is_for_trade, price, trade_notes, condition, language, manual_price, currency, is_user_reported, variant, reserved_until, is_featured, quantity'
      )
      .single()
    if (error) throw error

    // Al PUBLICAR (venta/cambio), avisamos a los usuarios con esa carta en su
    // wantlist. Best-effort: un fallo acá no debe romper la actualización.
    if (body.availability !== undefined && (data.is_for_sale || data.is_for_trade)) {
      try {
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        await notifyWantlistMatches({
          binderCardId: data.id,
          cardId: data.card_id,
          cardName: data.card_name,
          setId: data.set_id,
          number: data.number,
          price: effectivePrice(data.market_price, data.price_override, data.price, data.manual_price),
          sellerId: user.id,
          sellerUsername: sellerProfile?.username ?? 'coleccionista'
        })
        const price = effectivePrice(data.market_price, data.price_override, data.price, data.manual_price)
        await sendDiscordWebhook({
          username: 'TCG Claim · Market',
          embeds: [
            {
              title: data.card_name,
              url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/carta/${encodeURIComponent(data.card_id)}`,
              description: `**${data.set_id.toUpperCase()} · #${data.number}**\n${
                data.is_for_sale && data.is_for_trade
                  ? 'En venta o cambio'
                  : data.is_for_sale
                    ? 'En venta'
                    : 'Para cambio'
              }${price != null ? `\nPrecio: $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}`,
              color: data.is_for_sale ? 0x25d366 : 0x3b82f6,
              fields: [
                {
                  name: 'Vendedor',
                  value: sellerProfile?.username ? `@${sellerProfile.username}` : 'coleccionista',
                  inline: true
                }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        })
      } catch {
        // silencioso
      }
    }

    return NextResponse.json({ card: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}