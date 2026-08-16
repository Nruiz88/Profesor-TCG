import { readFile } from 'node:fs/promises'
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

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache')
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