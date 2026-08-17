import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

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
  images?: { small: string; large: string }
}

export interface SetData {
  id: string
  name: string
  series: string
  printedTotal: number
  total: number
  releaseDate?: string
}

const CACHE_DIR = path.join(process.cwd(), 'src', 'content')
const GITHUB_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master'

async function readLocal(file: string): Promise<string | null> {
  try {
    return await readFile(path.join(CACHE_DIR, file), 'utf8')
  } catch {
    return null
  }
}

export async function getSets(): Promise<SetData[]> {
  const local = await readLocal('sets.json')
  if (local) return JSON.parse(local)

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

  // Fallback: escanear los archivos por set (cache vieja sin index.json)
  const files = await readdir(CACHE_DIR)
  const cardFiles = files.filter((f) => f.endsWith('.json') && f !== 'sets.json' && f !== 'index.json')

  const all: Array<CardData & { setId: string }> = []
  for (const file of cardFiles) {
    const setId = file.replace('.json', '')
    const content = await readFile(path.join(CACHE_DIR, file), 'utf8')
    const cards: CardData[] = JSON.parse(content)
    for (const card of cards) {
      all.push({ ...card, setId })
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