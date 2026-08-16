import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCardImage } from '@/lib/cardImage'

export const dynamic = 'force-dynamic'

// Resuelve /binder/[username] -> primer binder público del usuario.
// Usa la policy RLS "profiles public read" (perfiles de dueños con binder público).
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, whatsapp_number, country, city')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { data: binder } = await supabase
      .from('binders')
      .select('id, title')
      .eq('user_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!binder) {
      return NextResponse.json(
        { error: 'Este usuario no tiene binders públicos' },
        { status: 404 }
      )
    }

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select(
        'id, binder_id, card_id, card_name, set_id, number, slot_number, market_price, status, price_override'
      )
      .eq('binder_id', binder.id)
      .order('slot_number', { ascending: true })
    if (error) throw error

    // Resolver la imagen server-side (pokemontcg.io devuelve el reverso
    // para cartas que no tiene; Scrydex es el fallback).
    const enriched = await Promise.all(
      (cards || []).map(async (c) => ({
        ...c,
        image: await resolveCardImage(c.set_id, c.number)
      }))
    )

    return NextResponse.json({
      binder: { id: binder.id, title: binder.title },
      owner: {
        username: profile.username,
        whatsapp_number: profile.whatsapp_number,
        country: profile.country,
        city: profile.city
      },
      cards: enriched
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
