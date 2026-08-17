import { NextResponse } from 'next/server'
import { getSetCards, getSets, getSetById } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params

  try {
    const cards = await getSetCards(setId)
    const sets = await getSets()
    const set = getSetById(sets, setId)

    // resolveCardImage evita el reverso que sirve pokemontcg.io (404 con body
    // de imagen) para sets sin imágenes, como los de McDonald's (me5 Pitch
    // Black): resuelve Scrydex o el placeholder "Sin imagen".
    const slim = await Promise.all(
      cards.map(async (c) => ({
        id: c.id,
        name: c.name,
        number: c.number,
        rarity: c.rarity || null,
        supertype: c.supertype || null,
        image: await resolveCardImage(setId, c.number)
      }))
    )

    return NextResponse.json({ setId, setName: set?.name || setId, cards: slim })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}