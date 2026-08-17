import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countCatalogPokemonSpecies, getCardMetadataMap } from '@/lib/catalog'
import { speciesFromCardName } from '@/lib/pokedex'
import { computeTrainerScore } from '@/lib/trainer'

export const dynamic = 'force-dynamic'

// Pokédex del usuario logueado: especies de Pokémon distintas en TODOS sus
// binders + total de especies del catálogo. El sidebar del binder y la página
// de perfil propio lo usan para mostrar las capturas mientras arman su
// colección.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { data: binders } = await supabase
      .from('binders')
      .select('id')
      .eq('user_id', user.id)
    const binderIds = (binders || []).map((b: { id: string }) => b.id)

    let captured = 0
    if (binderIds.length > 0) {
      const { data: rows } = await supabase
        .from('binder_cards')
        .select('card_id')
        .in('binder_id', binderIds)

      const meta = await getCardMetadataMap()
      const species = new Set<string>()
      for (const r of rows || []) {
        const m = meta.get(r.card_id)
        // Solo cuentan cartas de Pokémon (no entrenadores ni energía)
        if (m && m.supertype === 'Pokémon') {
          species.add(speciesFromCardName(m.name))
        }
      }
      captured = species.size
    }

    const total = await countCatalogPokemonSpecies()

    // Score de entrenador (XP + rango): mismas reglas que el perfil público,
    // con las capturas de arriba + claims completados + reseñas recibidas.
    const [{ data: completedClaims }, { count: reviewCount }] = await Promise.all([
      supabase
        .from('claims')
        .select('kind, buyer_id, seller_id')
        .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
        .eq('status', 'completed')
        .limit(1000),
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed_user_id', user.id)
    ])

    let completedSales = 0
    let completedTrades = 0
    let completedBuys = 0
    for (const c of completedClaims || []) {
      const row = c as { kind: string; buyer_id: string; seller_id: string }
      if (row.seller_id === user.id) {
        if (row.kind === 'sale' || row.kind === 'both') completedSales++
        if (row.kind === 'trade' || row.kind === 'both') completedTrades++
      }
      if (row.buyer_id === user.id) completedBuys++
    }

    const trainer = computeTrainerScore({
      capturedSpecies: captured,
      completedSales,
      completedTrades,
      completedBuys,
      reviewCount: reviewCount ?? 0
    })

    return NextResponse.json({ captured, total, trainer })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
