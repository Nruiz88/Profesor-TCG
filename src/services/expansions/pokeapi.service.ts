// ============================================================================
// Proveedor SECUNDARIO: PokéAPI (https://pokeapi.co).
// Contiene únicamente la función de fetch y formateo para PokéAPI.
//
// ⚠️ Nota técnica: PokéAPI NO expone datos de sets TCG (solo videojuegos:
// ability, berry, encounter, etc. — verificado en /api/v2/; /api/v2/tcg → 400).
// Este proveedor intenta el recurso por si algún día lo agregan y, al no
// existir, devuelve null en silencio: el orquestador sigue con el fallback
// local sin romper la cadena. La estructura queda lista para completarse.
// ============================================================================

import type { ExpansionSource } from './types'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2'

interface PokeApiTcgSetLike {
  name?: string
  series?: string
  releaseDate?: string
  cardCount?: number
  total?: number
}

export async function fetchFromPokeApi(
  setId: string
): Promise<ExpansionSource | null> {
  try {
    // Recurso hipotético de sets TCG en PokéAPI (hoy no existe → null).
    const res = await fetch(`${POKEAPI_BASE}/tcg/sets/${encodeURIComponent(setId)}`, {
      cache: 'no-store'
    })
    if (!res.ok) return null

    const json = (await res.json()) as PokeApiTcgSetLike
    if (!json || typeof json.name !== 'string' || json.name === '') return null

    const total = json.cardCount ?? json.total
    return {
      name: json.name,
      series: json.series && json.series.trim() !== '' ? json.series : undefined,
      releaseDate:
        json.releaseDate && json.releaseDate.trim() !== ''
          ? json.releaseDate
          : undefined,
      totalCards: total && total > 0 ? total : undefined
    }
  } catch {
    return null
  }
}
