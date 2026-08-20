import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { speciesFromCardName } from './pokedex'

export interface Card {
  id: string
  name: string
  supertype: string
  subtypes?: string[]
  number: string
  rarity?: string
  hp?: string
  types?: string[]
  set: string
  set_id: string
  set_name: string
  image: string
  price?: number | null
}

export interface CardData {
  id: string
  name: string
  supertype?: string
  subtypes?: string[]
  types?: string[]
  number: string
  rarity?: string
  hp?: string
  images?: { small: string; large: string }
}

export interface SetData {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate?: string
  images?: { symbol?: string; logo?: string }
}

const CACHE_DIR = path.join(process.cwd(), 'src', 'content')
const CONTENT_DIRS = [path.join(CACHE_DIR, 'en'), path.join(CACHE_DIR, 'ja')]
const GITHUB_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master'

let langMap: Record<string, 'en' | 'ja' | 'both'> | null = null

async function getLangMap(): Promise<Record<string, 'en' | 'ja' | 'both'>> {
  if (langMap) return langMap
  let map: Record<string, 'en' | 'ja' | 'both'> = {}
  try {
    const raw = await readFile(path.join(CACHE_DIR, 'lang-map.json'), 'utf8')
    map = JSON.parse(raw)
  } catch {
    map = {}
  }
  langMap = map
  return map
}

async function readLocal(file: string): Promise<string | null> {
  // Mapa setId → carpeta/idioma para redirigir directo a la carpeta correcta
  const setId = file.replace(/\.json$/, '')
  const map = await getLangMap()
  const loc = map[setId]
  const dirs = loc
    ? loc === 'both'
      ? CONTENT_DIRS
      : [path.join(CACHE_DIR, loc)]
    : CONTENT_DIRS
  for (const dir of dirs) {
    try {
      return await readFile(path.join(dir, file), 'utf8')
    } catch {
      // no está en esta carpeta, probar la siguiente
    }
  }
  // Fallback: archivo en la raíz (sets.json, index.json)
  try {
    return await readFile(path.join(CACHE_DIR, file), 'utf8')
  } catch {
    return null
  }
}

// Helper compartido: lee un archivo de set redirigiendo a la carpeta/idioma
// correcta según lang-map.json (usado también por /api/cards/[cardId])
export async function readLocalSetFile(file: string): Promise<string | null> {
  return readLocal(file)
}

const POCKET_SERIES = 'Pokémon TCG Pocket'

export async function getSets(): Promise<SetData[]> {
  const local = await readLocal('sets.json')
  const all = local ? JSON.parse(local) : await fetchSetsFromGithub()
  // Excluir Pokémon TCG Pocket: solo TCG físico
  return all.filter((s: SetData) => s.series !== POCKET_SERIES)
}

async function fetchSetsFromGithub(): Promise<SetData[]> {
  const res = await fetch(`${GITHUB_BASE}/sets/en.json`, { cache: 'force-cache' })
  if (!res.ok) throw new Error('No se pudo obtener el catálogo de sets')
  return res.json()
}

export async function getSetCards(setId: string): Promise<CardData[]> {
  const local = await readLocal(`${setId}.json`)
  if (local) return JSON.parse(local)

  const res = await fetch(`${GITHUB_BASE}/cards/en/${setId}.json`, { cache: 'force-cache' })
  if (!res.ok) throw new Error(`Set no encontrado: ${setId}`)
  return res.json()
}

export function cardToImage(card: CardData): string {
  const number = card.number
  return `https://images.pokemontcg.io/${card.id.split('-')[0]}/${number}_hires.png`
}

export function getSetById(sets: SetData[], id: string): SetData | undefined {
  return sets.find((s) => s.id === id)
}

let indexCache: Array<CardData & { setId: string }> | null = null

async function buildIndex(): Promise<Array<CardData & { setId: string }>> {
  if (indexCache) return indexCache

  // Índice precompilado por scripts/fetch-catalog.mjs: un solo archivo en vez de leer 174 JSON
  const indexFile = await readLocal('index.json')
  if (indexFile) {
    const parsed = JSON.parse(indexFile) as Array<CardData & { setId: string }>
    indexCache = parsed
    return parsed
  }

  // Fallback: escanear los archivos por set en ambas carpetas
  const all: Array<CardData & { setId: string }> = []
  for (const dir of CONTENT_DIRS) {
    let files: string[]
    try { files = await readdir(dir) } catch { continue }
    const cardFiles = files.filter((f) => f.endsWith('.json'))
    for (const file of cardFiles) {
      const setId = file.replace('.json', '')
      try {
        const content = await readFile(path.join(dir, file), 'utf8')
        const cards: CardData[] = JSON.parse(content)
        for (const card of cards) {
          all.push({ ...card, setId })
        }
      } catch {
        // archivo corrupto o ilegible
      }
    }
  }

  indexCache = all
  return all
}

// Filtrado puro (sin FS ni red): reutilizable por searchCards y testeable
// Busqueda por nombre, o por número tipo "015/084", "15/84" o "015" (opcionalmente + nombre de set)
export function filterCards(
  query: string,
  index: Array<CardData & { setId: string }>,
  sets: SetData[],
  limit = 40
): Array<CardData & { setId: string }> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const numberMatch = q.match(/^(\d+)(?:\s*\/\s*(\d+))?\s*(.*)$/)
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10)
    const total = numberMatch[2] ? parseInt(numberMatch[2], 10) : null
    const rest = numberMatch[3].trim()
    const setTotal = new Map(sets.map((s) => [s.id, s.printedTotal]))

    return index
      .filter((c) => {
        const cardNum = parseInt(c.number, 10)
        if (cardNum !== num) return false
        if (total !== null && total !== setTotal.get(c.setId)) return false
        if (rest) {
          const setName = sets.find((s) => s.id === c.setId)?.name.toLowerCase() ?? ''
          if (!setName.includes(rest)) return false
        }
        return true
      })
      .slice(0, limit)
  }

  return index
    .filter((c) => c.name.toLowerCase().includes(q))
    .slice(0, limit)
}

let cardByIdMap: Map<string, CardData & { setId: string }> | null = null

// Metadata (rarity, subtypes, supertype, types) por card_id, para enriquecer las cartas del binder
export async function getCardMetadataMap(): Promise<Map<string, CardData & { setId: string }>> {
  if (!cardByIdMap) {
    const index = await buildIndex()
    cardByIdMap = new Map(index.map((c) => [c.id, c]))
  }
  return cardByIdMap
}

export async function searchCards(query: string, limit = 40): Promise<Array<CardData & { setId: string }>> {
  const index = await buildIndex()
  const sets = await getSets()
  return filterCards(query, index, sets, limit)
}

let catalogSpeciesCache: number | null = null

// Total de especies Pokémon distintas del catálogo (denominador de la Pokédex
// del perfil). Se calcula una sola vez y se cachea por instancia serverless.
export async function countCatalogPokemonSpecies(): Promise<number> {
  if (catalogSpeciesCache != null) return catalogSpeciesCache
  const index = await buildIndex()
  const species = new Set<string>()
  for (const c of index) {
    if (c.supertype !== 'Pokémon') continue
    // Solo nombres en escritura latina: los sets japoneses/chinos duplican las
    // mismas especies (ヒトカゲ == Charmander) y no deben inflar el total.
    if (!/^[A-Za-z]/.test(c.name)) continue
    species.add(speciesFromCardName(c.name))
  }
  catalogSpeciesCache = species.size
  return catalogSpeciesCache
}