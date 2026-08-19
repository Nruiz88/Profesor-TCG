/**
 * Fuente oficial: pokemontcg.io (CDN de PokemonTCG).
 *
 * Limitaciones:
 * - Solo imágenes en inglés.
 * - Cuando la carta no existe, responde 404 con el REVERSO de la carta
 *   como body (el navegador lo renderiza como imagen real). Por eso se
 *   verifica server-side con HEAD request.
 * - No cubre todos los sets (ej: sets chicos como McDonald's).
 */

import { head } from './utils'

export function pokemontcgUrl(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}_hires.png`
}

/**
 * Verifica server-side que la carta exista: pokemontcg.io responde 404 (con el
 * reverso como body) para cartas que no tiene, y el HEAD distingue eso.
 */
export async function tryPokemontcg(
  setId: string,
  number: string
): Promise<string | null> {
  const url = pokemontcgUrl(setId, number)
  return (await head(url)) ? url : null
}
