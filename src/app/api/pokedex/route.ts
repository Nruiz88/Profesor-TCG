import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { countCatalogPokemonSpecies, getCardMetadataMap } from '@/lib/catalog'
import { speciesFromCardName } from '@/lib/pokedex'

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
    return NextResponse.json({ captured, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
