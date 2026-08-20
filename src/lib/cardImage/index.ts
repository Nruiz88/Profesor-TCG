/**
 * Resolución de imágenes de cartas Pokémon.
 *
 * Orden por idioma:
 * - No-inglés: TCGdex localizada → pokemontcg (EN) → Scrydex (EN) → TCGdex EN.
 * - Inglés:   según el source del manifest (pokemontcg | scrydex | tcgdex),
 *   y si la carta puntual no existe ahí, cae al resto de fuentes.
 *
 * Puntos clave:
 * - pokemontcg.io y TCGdex responden 404 limpio para cartas que no tienen:
 *   un HEAD alcanza para verificarlas.
 * - Scrydex responde 200 con el REVERSO de la carta como body para las que no
 *   tiene: se verifica descargando y comparando el hash del reverso.
 * - Cada carta se verifica y cachea por instancia serverless.
 *
 * El manifest se genera con: node scripts/precompute-images.mjs
 */

import type { CardLanguage } from '@/lib/cardLanguage'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { tryPokemontcg } from './pokemontcg'
import { scrydexUrl, unpadNumber, scrydexUrlExists } from './scrydex'
import { tryTcgdex } from './tcgdex'
import { NO_IMAGE_PLACEHOLDER, imageCache, cacheImage } from './utils'

// Cache persistente en Supabase (card_image_cache): evita repetir la cadena
// de verificaciones a CDNs externos cuando la instancia serverless se recicla
// (el cache en memoria `imageCache` se pierde entre requests en Vercel).
const DB_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

function cacheKey(setId: string, number: string, language: string): string {
  return `${setId}:${number}:${language}`
}

async function fromDbCache(
  key: string
): Promise<string | null> {
  const [setId, number, language] = key.split(':')
  const client = adminClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('card_image_cache')
      .select('url, updated_at')
      .eq('set_id', setId)
      .eq('number', number)
      .eq('language', language)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const fresh = Date.now() - new Date(data.updated_at).getTime() < DB_CACHE_TTL_MS
    if (!fresh) return null
    return data.url as string
  } catch {
    return null
  }
}

async function saveToDbCache(key: string, url: string): Promise<void> {
  const [setId, number, language] = key.split(':')
  const client = adminClient()
  if (!client) return
  try {
    await client.from('card_image_cache').upsert(
      {
        set_id: setId,
        number,
        language,
        url,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'set_id,number,language' }
    )
  } catch {
    // Best-effort: sin service key o tabla ausente, seguimos sin cache persistente.
  }
}

// Re-exportar para uso externo
export { NO_IMAGE_PLACEHOLDER } from './utils'
export { pokemontcgUrl } from './pokemontcg'

// ── Manifest pre-computado ──────────────────────────────────────────

type ImageSource = 'pokemontcg' | 'scrydex' | 'scrydex-unpadded' | 'tcgdex' | 'none'

// @ts-ignore — Next.js resuelve JSON imports en build time
import manifestData from '../../content/image-manifest.json'
const manifest: Record<string, ImageSource> = manifestData as Record<string, ImageSource>

// ── Verificadores por fuente ─────────────────────────────────────────

/**
 * Scrydex solo cubre sets de pokemon-tcg-data. El manifest marca 'none' a los
 * sets que ni pokemontcg.io, ni Scrydex ni TCGdex tienen (verificado offline en
 * precompute-images.mjs): para esos, evitar descargar el reverso en cada carta.
 */
async function tryScrydex(
  setId: string,
  number: string,
  unpadded = false
): Promise<string | null> {
  if (manifest[setId] === 'none') return null
  const n = unpadded ? unpadNumber(number) : number
  const url = scrydexUrl(setId, n)
  return (await scrydexUrlExists(url)) ? url : null
}

/** Encadena candidatos y devuelve la primera URL verificada. */
async function firstOf(candidates: Promise<string | null>[]): Promise<string | null> {
  for (const candidate of candidates) {
    const url = await candidate
    if (url) return url
  }
  return null
}

// ── Resolución ───────────────────────────────────────────────────────

/**
 * Resuelve la imagen de una carta.
 *
 * @param setId    - ID del set (ej: "sv03", "sm1", "base1")
 * @param number   - Número de la carta (ej: "75", "038")
 * @param language - Idioma de la copia física. Default: 'EN'
 * @returns URL de la imagen resuelta, o placeholder si no se encontró.
 */
export async function resolveCardImage(
  setId: string,
  number: string,
  language: CardLanguage = 'EN'
): Promise<string> {
  const key = cacheKey(setId, number, language)
  const cached = imageCache.get(key)
  if (cached) return cached

  // Cache persistente (Supabase): evita contactar CDNs en cada request.
  const dbCached = await fromDbCache(key)
  if (dbCached) {
    cacheImage(key, dbCached)
    return dbCached
  }

  let url: string | null = null

  if (language !== 'EN') {
    url = await firstOf([
      tryTcgdex(setId, number, language),
      tryPokemontcg(setId, number),
      tryScrydex(setId, number),
      tryScrydex(setId, number, true),
      tryTcgdex(setId, number, 'EN')
    ])
  } else {
    const source = manifest[setId]
    switch (source) {
      case 'pokemontcg':
        url = await firstOf([
          tryPokemontcg(setId, number),
          tryScrydex(setId, number),
          tryScrydex(setId, number, true),
          tryTcgdex(setId, number, 'EN')
        ])
        break
      case 'scrydex-unpadded':
        url = await firstOf([
          tryScrydex(setId, number, true),
          tryScrydex(setId, number),
          tryPokemontcg(setId, number),
          tryTcgdex(setId, number, 'EN')
        ])
        break
      case 'scrydex':
        url = await firstOf([
          tryScrydex(setId, number),
          tryScrydex(setId, number, true),
          tryPokemontcg(setId, number),
          tryTcgdex(setId, number, 'EN')
        ])
        break
      case 'tcgdex':
        url = await firstOf([
          tryTcgdex(setId, number, 'EN'),
          tryPokemontcg(setId, number),
          tryScrydex(setId, number),
          tryScrydex(setId, number, true)
        ])
        break
      default:
        url = await firstOf([
          tryPokemontcg(setId, number),
          tryScrydex(setId, number),
          tryScrydex(setId, number, true),
          tryTcgdex(setId, number, 'EN')
        ])
        break
    }
  }

  const result = url ?? NO_IMAGE_PLACEHOLDER
  cacheImage(key, result)
  await saveToDbCache(key, result)
  return result
}
