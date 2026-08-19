/**
 * Utilidades compartidas para todas las fuentes de imágenes.
 */

/** Verifica server-side si una URL de imagen existe (HEAD request). */
export async function head(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    return res.ok
  } catch {
    return false
  }
}

/** Placeholder oscuro 63:88 (proporción de carta) con texto "Sin imagen" */
export const NO_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="880" viewBox="0 0 630 880">
    <rect width="630" height="880" rx="24" fill="#0f172a"/>
    <rect x="12" y="12" width="606" height="856" rx="18" fill="none" stroke="#1e293b" stroke-width="4"/>
    <text x="315" y="425" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#475569">Sin imagen</text>
    <text x="315" y="470" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#334155">no disponible</text>
  </svg>`
)}`

/** Cache en memoria de resultados (por instancia serverless). */
const MAX_CACHE = 5000
export const imageCache = new Map<string, string>()

export function cacheImage(key: string, value: string): void {
  if (imageCache.size >= MAX_CACHE) {
    const oldest = imageCache.keys().next().value
    if (oldest !== undefined) imageCache.delete(oldest)
  }
  imageCache.set(key, value)
}
