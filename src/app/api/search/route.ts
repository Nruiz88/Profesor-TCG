import { NextResponse } from 'next/server'
import { searchCards, getSets, getSetById } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'
import { validate, extractParams } from '@/lib/validate'
import { searchSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const params = validate(searchSchema, extractParams(req))
  if (params.error) return params.error
  const { q } = params.data

  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const matches = await searchCards(q)
    const sets = await getSets()

    // resolveCardImage verifica server-side la existencia: pokemontcg.io
    // responde 404 con el REVERSO de la carta como body para las que no tiene
    // (ej. sets de McDonald's como me5 "Pitch Black"), y el navegador lo
    // renderiza igual. Por eso resolvemos la imagen real o un placeholder.
    const results = await Promise.all(
      matches.map(async (c) => {
        const set = getSetById(sets, c.setId)
        return {
          id: c.id,
          name: c.name,
          number: c.number,
          rarity: c.rarity || null,
          set_id: c.setId,
          set_name: set?.name || c.setId,
          image: await resolveCardImage(c.setId, c.number)
        }
      })
    )

    return NextResponse.json({ query: q, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}