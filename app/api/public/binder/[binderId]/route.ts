import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCardMetadataMap } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ binderId: string }> }) {
  const { binderId } = await params
  const supabase = await createClient()

  try {
    // RLS: solo devuelve el binder si is_public = true (para visitantes anónimos)
    const { data: binder } = await supabase
      .from('binders')
      .select('id, title')
      .eq('id', binderId)
      .eq('is_public', true)
      .maybeSingle()

    if (!binder) {
      return NextResponse.json({ error: 'Binder no encontrado o privado' }, { status: 404 })
    }

    const { data: cards, error } = await supabase
      .from('binder_cards')
      .select('id, binder_id, card_id, card_name, set_id, number, slot_number, market_price')
      .eq('binder_id', binderId)
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
          image: await resolveCardImage(c.set_id, c.number)
        }
      })
    )

    return NextResponse.json({ binder, cards: enriched })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}