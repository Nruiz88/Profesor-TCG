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

export function pokemontcgUrl(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}_hires.png`
}
