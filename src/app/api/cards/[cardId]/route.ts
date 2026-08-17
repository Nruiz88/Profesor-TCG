import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveCardImage } from '@/lib/cardImage'

// Detalle completo de una carta. Intenta la traducción en español de TCGdex
// (api.tcgdex.net/v2/es) y cae al catálogo local (pokemon-tcg-data, inglés)
// cuando la carta no está traducida o TCGdex no responde.
// Datos públicos: no requiere auth (lo usa también la vista pública).
export const dynamic = 'force-dynamic'

const CACHE_DIR = path.join(process.cwd(), 'src', 'content')
const TCGDEX_ES = (id: string) => `https://api.tcgdex.net/v2/es/cards/${encodeURIComponent(id)}`

export interface FullCard {
  id: string
  name: string
  supertype?: string
  subtypes?: string[]
  level?: string
  hp?: string
  types?: string[]
  evolvesFrom?: string
  evolvesTo?: string[]
  abilities?: { name: string; text: string; type?: string }[]
  attacks?: { name: string; cost?: string[]; convertedEnergyCost?: number; damage?: string; text?: string }[]
  weaknesses?: { type: string; value: string }[]
  resistances?: { type: string; value: string }[]
  retreatCost?: string[]
  convertedRetreatCost?: number
  number: string
  artist?: string
  rarity?: string
  flavorText?: string
  nationalPokedexNumbers?: number[]
  legalities?: Record<string, string>
  images?: { small: string; large: string }
  setId: string
  set_name: string
  image: string
}

// Forma de la carta en TCGdex (locale es)
interface TcgdexCard {
  id?: string
  name?: string
  category?: string
  types?: string[]
  hp?: string
  attacks?: { name: string; cost?: string[]; damage?: string; effect?: string }[]
  abilities?: { name: string; effect?: string; type?: string }[]
  weaknesses?: { type: string; value: string }[]
  resistances?: { type: string; value: string }[]
  retreat?: number
  dexId?: number | number[]
  illustrator?: string
  rarity?: string
  flavorText?: string
  legal?: Record<string, boolean>
  set?: { id: string; name: string }
}

// TCGdex traduce los tipos al español; el modal usa los nombres en inglés
const TYPE_ES_TO_EN: Record<string, string> = {
  Planta: 'Grass',
  Fuego: 'Fire',
  Agua: 'Water',
  Rayo: 'Lightning',
  Psíquico: 'Psychic',
  Lucha: 'Fighting',
  Oscuridad: 'Darkness',
  Metálica: 'Metal',
  Hada: 'Fairy',
  Dragón: 'Dragon',
  Incolora: 'Colorless'
}

const toEn = (t: string | undefined) => TYPE_ES_TO_EN[t ?? ''] ?? t

// Cache en memoria de las respuestas de TCGdex es (por id). En serverless el
// Map vive por instancia; alcanza para evitar golpear la API en cada apertura.
const esCache = new Map<string, TcgdexCard | null>()

async function fetchTcgdexEs(cardId: string): Promise<TcgdexCard | null> {
  if (esCache.has(cardId)) return esCache.get(cardId) ?? null

  try {
    const res = await fetch(TCGDEX_ES(cardId), {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 }
    })
    if (!res.ok) {
      // 404: la carta no está traducida. No cachear errores de red (5xx).
      if (res.status === 404) esCache.set(cardId, null)
      return null
    }
    const data: TcgdexCard = await res.json()
    esCache.set(cardId, data)
    return data
  } catch {
    return null // timeout / red caída → catálogo local
  }
}

async function readLocal(file: string): Promise<string | null> {
  try {
    return await readFile(path.join(CACHE_DIR, file), 'utf8')
  } catch {
    return null
  }
}

// Merge: los campos traducidos de TCGdex es priman; el resto queda del catálogo local
function mergeSpanish(local: FullCard, es: TcgdexCard): FullCard {
  const attacks = es.attacks?.map((a) => ({
    name: a.name ?? '',
    cost: a.cost?.map(toEn),
    damage: a.damage ?? '',
    text: a.effect ?? ''
  }))
  const abilities = es.abilities?.map((a) => ({
    name: a.name ?? '',
    text: a.effect ?? '',
    type: a.type
  }))
  const weaknesses = es.weaknesses?.map((w) => ({ type: toEn(w.type), value: w.value }))
  const resistances = es.resistances?.map((r) => ({ type: toEn(r.type), value: r.value }))
  const dexId = es.dexId
  const legalities: Record<string, string> | undefined = es.legal
    ? Object.fromEntries(
        Object.entries(es.legal).map(([k, v]) => [k, v ? 'Legal' : 'No permitida'])
      )
    : undefined

  return {
    ...local,
    name: es.name || local.name,
    supertype: es.category || local.supertype,
    hp: es.hp || local.hp,
    types: es.types?.map(toEn) || local.types,
    attacks: attacks?.length ? attacks : local.attacks,
    abilities: abilities?.length ? abilities : local.abilities,
    weaknesses: weaknesses?.length ? weaknesses : local.weaknesses,
    resistances: resistances?.length ? resistances : local.resistances,
    retreatCost: es.retreat != null ? Array(es.retreat).fill('Colorless') : local.retreatCost,
    convertedRetreatCost: es.retreat ?? local.convertedRetreatCost,
    artist: es.illustrator || local.artist,
    rarity: es.rarity || local.rarity,
    flavorText: es.flavorText || local.flavorText,
    nationalPokedexNumbers:
      dexId != null
        ? Array.isArray(dexId)
          ? dexId
          : [dexId]
        : local.nationalPokedexNumbers,
    legalities: legalities ?? local.legalities,
    set_name: es.set?.name || local.set_name
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params

  // card_id tiene el formato `${setId}-${number}` (ej: base1-4, swshp-SWSH076)
  const dash = cardId.indexOf('-')
  if (dash <= 0) {
    return NextResponse.json({ error: 'cardId inválido' }, { status: 400 })
  }
  const setId = cardId.slice(0, dash)
  const number = cardId.slice(dash + 1)

  try {
    const [setContent, setsContent] = await Promise.all([
      readLocal(`${setId}.json`),
      readLocal('sets.json')
    ])

    if (!setContent) {
      return NextResponse.json({ error: `Set no encontrado: ${setId}` }, { status: 404 })
    }

    const cards: FullCard[] = JSON.parse(setContent)
    const card =
      cards.find((c) => c.id === cardId) ?? cards.find((c) => c.number === number)
    if (!card) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    let set_name = setId
    if (setsContent) {
      const sets: { id: string; name: string }[] = JSON.parse(setsContent)
      set_name = sets.find((s) => s.id === setId)?.name ?? setId
    }

    const base: FullCard = {
      ...card,
      setId,
      set_name,
      // pokemontcg.io sirve el reverso en lugar de 404 limpio: resolvemos la
      // imagen real o un placeholder "Sin imagen"
      image: await resolveCardImage(setId, card.number)
    }

    // Enriquecer con la traducción al español cuando TCGdex la tenga
    const es = await fetchTcgdexEs(cardId)
    const result = es ? mergeSpanish(base, es) : base

    return NextResponse.json({ card: result, locale: es ? 'es' : 'local' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
