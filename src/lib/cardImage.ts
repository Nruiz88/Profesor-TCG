// Fuente de imágenes: pokemontcg.io (CDN oficial de PokemonTCG).
// Ojo: cuando esa fuente no tiene la carta con el set/número exacto, responde
// HTTP 404 con el REVERSO de la carta como body — el navegador lo renderiza
// como si fuera la imagen real (y ni siquiera dispara onError). Por eso las
// rutas API verifican el status server-side y marcan las cartas sin imagen.

export function cardImageUrl(setId: string, number: string): string {
  return `https://images.pokemontcg.io/${setId}/${number}_hires.png`
}

// Fuente alternativa: Scrydex sirve el mismo formato de ID que nuestro
// catálogo ({set}-{number}) y cubre cartas que pokemontcg.io no tiene
// (ej. sets chicos como McDonald's). Mismo tamaño hires (733x1024).
function scrydexImageUrl(setId: string, number: string): string {
  return `https://images.scrydex.com/pokemon/${setId}-${number}/large`
}

// Placeholder oscuro 63:88 (proporción de carta) con texto "Sin imagen"
export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880" viewBox="0 0 630 880">
    <rect width="630" height="880" rx="24" fill="#0f172a"/>
    <rect x="12" y="12" width="606" height="856" rx="18" fill="none" stroke="#1e293b" stroke-width="4"/>
    <text x="315" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#475569">Sin imagen</text>
    <text x="315" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#334155">no disponible</text>
  </svg>`
)}`

// Cache en memoria de resultados (por instancia serverless; alcanza para
// evitar repetir requests al CDN en cada carga del binder).
const imageCache = new Map<string, string>()

/**
 * Verifica server-side si la imagen de una carta existe. Orden de fuentes:
 * 1. pokemontcg.io (la oficial) — si responde 404 (que es cuando sirve el
 *    reverso de la carta como body), seguimos a Scrydex.
 * 2. Scrydex — mismo formato de ID que nuestro catálogo; cubre sets chicos.
 * 3. Si ambas fallan, NO_IMAGE_PLACEHOLDER ("Sin imagen").
 */
export async function resolveCardImage(setId: string, number: string): Promise<string> {
  const key = `${setId}/${number}`
  const url = cardImageUrl(setId, number)

  const cached = imageCache.get(key)
  if (cached !== undefined) {
    return cached
  }

  const head = async (u: string): Promise<boolean> => {
    try {
      const res = await fetch(u, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      })
      return res.ok
    } catch {
      return false
    }
  }

  const [pokemontcgOk, scrydexOk] = await Promise.all([
    head(url),
    head(scrydexImageUrl(setId, number))
  ])

  const resolved = pokemontcgOk ? url : scrydexOk ? scrydexImageUrl(setId, number) : NO_IMAGE_PLACEHOLDER
  imageCache.set(key, resolved)
  return resolved
}
