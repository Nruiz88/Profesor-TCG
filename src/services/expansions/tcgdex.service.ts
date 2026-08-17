// ============================================================================
// Proveedor PRIMARIO: TCGdex API (https://tcgdex.dev).
// Contiene únicamente la función de fetch y formateo para TCGdex.
//
// Estrategia interna del proveedor:
//   1. Endpoint de detalle (/sets/:id) — datos completos (serie, fecha, total).
//   2. Si el detalle está caído (502) o no existe, respaldo con el listado de
//      sets (/sets) — nombre + cardCount oficial — buscando por id normalizado
//      o por coincidencia de nombre.
// Cualquier error se captura en silencio y devuelve null: el orquestador
// decide si seguir con el siguiente proveedor.
// ============================================================================

import type { ExpansionSource } from './types'

const TCGDEX_BASE = 'https://api.tcgdex.net/v2/en'
const TCGDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000

interface TcgdexSet {
  id: string
  name: string
  series?: string
  releaseDate?: string
  cardCount?: { total?: number; official?: number }
  symbol?: string
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9&]/g, '')
}

// pokemontcg.io usa ids sin padding que TCGdex escribe con dos dígitos:
// sv5 -> sv05, sm1 -> sm01, sv3pt5 -> sv03.5, base1 -> base1
export function toTcgdexId(setId: string): string {
  let id = setId.toLowerCase()
  id = id.replace(/pt5$/, '.5')
  const m = id.match(/^([a-z]+)(\d+(?:\.\d+)?)$/)
  if (!m) return id
  const [, prefix, num] = m
  if (prefix !== 'sv' && prefix !== 'sm') return id
  const fixed = num.includes('.')
    ? num.replace(/^(\d)\./, '0$1.')
    : num.padStart(2, '0')
  return `${prefix}${fixed}`
}

function toSource(json: TcgdexSet): ExpansionSource | null {
  if (!json?.name) return null
  const total = json.cardCount?.official ?? json.cardCount?.total
  return {
    name: json.name,
    series: json.series && json.series.trim() !== '' ? json.series : undefined,
    releaseDate:
      json.releaseDate && json.releaseDate.trim() !== ''
        ? json.releaseDate
        : undefined,
    totalCards: total && total > 0 ? total : undefined
  }
}

// Caché en memoria del listado de sets (el detalle puede estar caído)
let setsCache: TcgdexSet[] | null = null
let setsCacheAt = 0

async function getTcgdexSets(): Promise<TcgdexSet[] | null> {
  if (setsCache && Date.now() - setsCacheAt < TCGDEX_CACHE_TTL_MS) return setsCache
  try {
    const res = await fetch(`${TCGDEX_BASE}/sets`, { cache: 'no-store' })
    if (!res.ok) return null
    setsCache = (await res.json()) as TcgdexSet[]
    setsCacheAt = Date.now()
    return setsCache
  } catch {
    return null
  }
}

// Paso 1: endpoint de detalle (datos completos)
async function fetchDetail(setId: string): Promise<ExpansionSource | null> {
  try {
    const res = await fetch(`${TCGDEX_BASE}/sets/${toTcgdexId(setId)}`, {
      cache: 'no-store'
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    return toSource((await res.json()) as TcgdexSet)
  } catch {
    return null
  }
}

// Paso 2: respaldo con el listado de sets (nombre + total oficial)
async function fetchFromList(
  setId: string,
  localName?: string
): Promise<ExpansionSource | null> {
  const sets = await getTcgdexSets()
  if (!sets || sets.length === 0) return null
  const byId = sets.find((s) => s.id === toTcgdexId(setId))
  const byName = localName
    ? sets.find((s) => normalizeText(s.name) === normalizeText(localName))
    : undefined
  return byId ?? byName ? toSource((byId ?? byName) as TcgdexSet) : null
}

// Punto de entrada del proveedor: devuelve los datos de TCGdex o null.
export async function fetchFromTcgdex(
  setId: string,
  localName?: string
): Promise<ExpansionSource | null> {
  const detail = await fetchDetail(setId)
  if (detail) return detail
  return fetchFromList(setId, localName)
}
