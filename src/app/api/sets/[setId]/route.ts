import { NextResponse } from 'next/server'
import { getSetCards, cardToImage, getSets, getSetById } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params

  try {
    const cards = await getSetCards(setId)
    const sets = await getSets()
    const set = getSetById(sets, setId)

    const slim = cards.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      rarity: c.rarity || null,
      supertype: c.supertype || null,
      image: cardToImage(c)
    }))

    return NextResponse.json({ setId, setName: set?.name || setId, cards: slim })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}