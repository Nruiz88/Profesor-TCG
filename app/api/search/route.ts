import { NextResponse } from 'next/server'
import { searchCards, cardToImage, getSets, getSetById } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const matches = await searchCards(q)
    const sets = await getSets()

    const results = matches.map((c) => {
      const set = getSetById(sets, c.setId)
      return {
        id: c.id,
        name: c.name,
        number: c.number,
        rarity: c.rarity || null,
        set_id: c.setId,
        set_name: set?.name || c.setId,
        image: cardToImage(c)
      }
    })

    return NextResponse.json({ query: q, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}