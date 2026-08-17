// ============================================================================
// Servicio de expansiones — Orquestador principal (Service Pattern).
//
// getExpansionData(setId) ejecuta la cadena de proveedores en SECUENCIA con
// short-circuiting (lazy loading):
//
//   1. TCGdex (primaria)        — si devuelve un resultado, NO se consulta la
//                                 segunda API (short-circuit).
//   2. PokéAPI (secundaria)     — solo si TCGdex devolvió null.
//   3. Fallback local           — catálogo local + assets locales + CDN, si
//                                 ambas APIs fallaron.
//
// El catálogo local (src/content) también se usa para completar campos
// estructurales (serie/fecha) cuando el proveedor primario responde parcial,
// sin disparar llamadas de red extra. El resultado se cachea en memoria y en
// Supabase (expansions_cache, TTL 24h) para evitar redundancia.
// ============================================================================

import { existsSync } from 'node:fs'
import path from 'node:path'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getSets } from '@/lib/catalog'
import { fetchFromTcgdex } from './tcgdex.service'
import { fetchFromPokeApi } from './pokeapi.service'
import type { ExpansionData, ExpansionSource } from './types'

export type { ExpansionData, ExpansionSource } from './types'

const IMAGES_BASE = 'https://images.pokemontcg.io'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface LocalSetLike {
  id: string
  name: string
  series: string
  printedTotal?: number
  total?: number
  releaseDate?: string
}

// ---------------------------------------------------------------------------
// Caché en memoria (por instancia del servidor)
// ---------------------------------------------------------------------------
const memoryCache = new Map<string, { at: number; data: ExpansionData }>()

function fromMemoryCache(setId: string): ExpansionData | null {
  const hit = memoryCache.get(setId)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
  if (hit) memoryCache.delete(setId)
  return null
}

// ---------------------------------------------------------------------------
// Caché en Supabase (expansions_cache) — persiste entre instancias
// ---------------------------------------------------------------------------
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

async function fromDbCache(setId: string): Promise<ExpansionData | null> {
  const client = adminClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('expansions_cache')
      .select('payload, updated_at')
      .eq('set_id', setId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const fresh = Date.now() - new Date(data.updated_at).getTime() < CACHE_TTL_MS
    if (!fresh) return null
    return data.payload as ExpansionData
  } catch {
    return null
  }
}

async function saveToDbCache(setId: string, data: ExpansionData): Promise<void> {
  const client = adminClient()
  if (!client) return
  try {
    await client.from('expansions_cache').upsert(
      { set_id: setId, payload: data, updated_at: new Date().toISOString() },
      { onConflict: 'set_id' }
    )
  } catch {
    // Best-effort: si la tabla no existe o no hay service key, seguimos sin caché.
  }
}

// ---------------------------------------------------------------------------
// Catálogo local (pokemon-tcg-data en src/content): fallback de datos + fuente
// de campos estructurales (serie, fecha, total impreso). Sin red.
// ---------------------------------------------------------------------------
async function fromLocalCatalog(setId: string): Promise<ExpansionSource | null> {
  try {
    const sets = await getSets()
    const s = sets.find((x: LocalSetLike) => x.id === setId)
    if (!s) return null
    return {
      name: s.name,
      series: s.series,
      releaseDate: s.releaseDate ?? '',
      totalCards: s.printedTotal ?? s.total ?? 0
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Imágenes: assets locales primero, CDN de pokemontcg.io después. Si no hay
// nada, '' y el componente muestra su placeholder temático.
// ---------------------------------------------------------------------------
function resolveLogoUrl(setId: string): string {
  const local = path.join(
    process.cwd(),
    'public',
    'expansions',
    'logos',
    `${setId}.png`
  )
  if (existsSync(local)) return `/expansions/logos/${setId}.png`
  return `${IMAGES_BASE}/${setId}/logo.png`
}

function resolveSymbolUrl(setId: string): string {
  return `${IMAGES_BASE}/${setId}/symbol.png`
}

// ---------------------------------------------------------------------------
// Orquestador: getExpansionData(setId)
// ---------------------------------------------------------------------------
export async function getExpansionData(setId: string): Promise<ExpansionData> {
  const id = setId.trim().toLowerCase()
  if (!id) throw new Error('Falta setId')

  // 1. Cachés (memoria y Supabase) — TTL 24h
  const memory = fromMemoryCache(id)
  if (memory) return memory

  const db = await fromDbCache(id)
  if (db) {
    memoryCache.set(id, { at: Date.now(), data: db })
    return db
  }

  // El catálogo local es local (sin red): se lee para el matching por nombre
  // del proveedor primario y para completar/fallback. No es una "segunda API".
  const local = await fromLocalCatalog(id)

  // 2. Cadena secuencial con short-circuiting:
  //    TCGdex primero; PokéAPI SOLO si TCGdex devolvió null.
  const tcgdex = await fetchFromTcgdex(id, local?.name)
  const pokeapi = tcgdex ? null : await fetchFromPokeApi(id)

  // 3. Fallback local: si ambas APIs fallaron, usamos el catálogo local.
  //    También completa campos estructurales (serie/fecha) que un proveedor
  //    primario parcial no haya traído.
  const source = tcgdex ?? pokeapi ?? local ?? ({} as ExpansionSource)

  const name = source.name ?? local?.name ?? id
  const series = source.series ?? local?.series ?? ''
  const releaseDate = source.releaseDate ?? local?.releaseDate ?? ''
  // El total impreso del catálogo es el denominador correcto para el progreso
  // de colección (el cardCount "oficial" de TCGdex coincide con printedTotal).
  const totalCards =
    source.totalCards ?? local?.totalCards ?? 0

  const result: ExpansionData = {
    id,
    name,
    series,
    releaseDate,
    totalCards,
    logoUrl: resolveLogoUrl(id),
    symbolUrl: resolveSymbolUrl(id)
  }

  memoryCache.set(id, { at: Date.now(), data: result })
  await saveToDbCache(id, result)

  return result
}
