import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCardMetadataMap } from '@/lib/catalog'
import { resolveCardImage, NO_IMAGE_PLACEHOLDER } from '@/lib/cardImage'
import { validate, extractParams } from '@/lib/validate'
import { wantlistSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 60
// Tope de candidatos a procesar en memoria (recientes) antes de filtrar y paginar
const MAX_CANDIDATES = 300

type QueryClient = {
  from: (table: string) => any
}

interface SeekerProfile {
  username: string
  city: string | null
  country: string | null
  whatsapp_number: string | null
}

// Perfil del buscador por user_id: wantlist_cards.user_id apunta a auth.users
// y no hay FK directo hacia profiles (mismo patrón que explore/route).
async function getProfilesByUserId(
  supabase: QueryClient,
  userIds: string[]
): Promise<Map<string, SeekerProfile>> {
  if (userIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, city, country, whatsapp_number')
    .in('id', userIds)
  if (error) throw error
  return new Map(
    (data || []).map(
      (p: {
        id: string
        username: string
        city: string | null
        country: string | null
        whatsapp_number: string | null
      }) => [
        p.id,
        {
          username: p.username,
          city: p.city,
          country: p.country,
          whatsapp_number: p.whatsapp_number
        }
      ]
    )
  )
}

export interface PublicWantlistEntry {
  id: string
  user_id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string | null
  number: string
  max_budget: number | null
  currency: string
  rarity: string | null
  supertype: string | null
  subtypes: string[] | null
  types: string[] | null
  image: string
  username: string
  city: string | null
  country: string | null
  whatsapp_number: string | null
  created_at: string
}

export interface WantlistFacets {
  sets: { id: string; name: string }[]
  cities: string[]
}

interface WantlistRow {
  id: string
  user_id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string | null
  number: string
  max_budget: number | null
  currency: string
  created_at: string
}

export async function GET(req: Request) {
  const params = validate(wantlistSchema, extractParams(req))
  if (params.error) return params.error
  const { q: rawQ, type: typeFilter, city: cityFilter, limit: rawLimit, offset } = params.data
  const q = rawQ.trim()
  const limit = Math.min(rawLimit, MAX_LIMIT)

  const supabase = await createClient()

  try {
    // wantlist_cards es pública de lectura por RLS: las cartas que la comunidad
    // está buscando. Traemos un lote de candidatos recientes y filtramos
    // ciudad/tipo en memoria (dependen del perfil y del catálogo).
    const { data, error } = await supabase
      .from('wantlist_cards')
      .select(
        'id, user_id, card_id, card_name, set_id, set_name, number, max_budget, currency, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(MAX_CANDIDATES)
    if (error) throw error

    const rows = (data || []) as unknown as WantlistRow[]
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]

    const [meta, profiles] = await Promise.all([
      getCardMetadataMap(),
      getProfilesByUserId(supabase, userIds)
    ])

    // Enriquecer + filtrar en memoria (búsqueda por nombre, tipo de energía y ciudad)
    // Primera pasada: filtrar y armar candidatos. La resolución de imágenes se
    // hace en PARALELO después para no bloquear en verificaciones secuenciales.
    const candidates: Array<{
      w: WantlistRow
      seeker: SeekerProfile | null
      meta: NonNullable<ReturnType<typeof meta.get>>
    }> = []
    for (const w of rows) {
      if (q && !w.card_name.toLowerCase().includes(q.toLowerCase())) continue
      const m = meta.get(w.card_id)
      if (typeFilter && !(m?.types ?? []).includes(typeFilter)) continue
      const seeker = profiles.get(w.user_id) ?? null
      if (cityFilter && seeker?.city !== cityFilter) continue
      candidates.push({ w, seeker, meta: m! })
    }

    const imageMap = new Map<string, string>()
    await Promise.all(
      candidates.map(async (c) => {
        const img = await resolveCardImage(c.w.set_id, c.w.number)
        imageMap.set(`${c.w.set_id}::${c.w.number}`, img)
      })
    )

    const enriched: PublicWantlistEntry[] = []
    const setMap = new Map<string, string>()
    for (const c of candidates) {
      const w = c.w
      const m = c.meta
      const entry: PublicWantlistEntry = {
        id: w.id,
        user_id: w.user_id,
        card_id: w.card_id,
        card_name: w.card_name,
        set_id: w.set_id,
        set_name: w.set_name,
        number: w.number,
        max_budget: w.max_budget,
        currency: w.currency,
        rarity: m?.rarity ?? null,
        supertype: m?.supertype ?? null,
        subtypes: m?.subtypes ?? null,
        types: m?.types ?? null,
        image: imageMap.get(`${w.set_id}::${w.number}`) ?? NO_IMAGE_PLACEHOLDER,
        username: c.seeker?.username ?? 'coleccionista',
        city: c.seeker?.city ?? null,
        country: c.seeker?.country ?? null,
        whatsapp_number: c.seeker?.whatsapp_number ?? null,
        created_at: w.created_at
      }
      enriched.push(entry)
      if (entry.set_name) setMap.set(w.set_id, entry.set_name)
    }

    const page = enriched.slice(offset, offset + limit)
    const hasMore = enriched.length > offset + limit

    // Facets: sets y ciudades presentes en el resultado filtrado completo
    const cities = [...new Set(enriched.map((c) => c.city).filter(Boolean) as string[])].sort()
    const facets: WantlistFacets = {
      sets: [...setMap.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      cities
    }

    return NextResponse.json({ wantlist: page, facets, hasMore })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}