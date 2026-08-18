import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCardMetadataMap } from '@/lib/catalog'
import { resolveCardImage } from '@/lib/cardImage'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 60

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
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10) || 12, MAX_LIMIT)

  try {
    // wantlist_cards es pública de lectura por RLS: las últimas cartas que la
    // comunidad está buscando, para ofrecer un Swap directo por WhatsApp.
    const { data, error } = await supabase
      .from('wantlist_cards')
      .select(
        'id, user_id, card_id, card_name, set_id, set_name, number, max_budget, currency, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const rows = (data || []) as unknown as WantlistRow[]
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]

    const [meta, profiles] = await Promise.all([
      getCardMetadataMap(),
      getProfilesByUserId(supabase, userIds)
    ])

    const wantlist = await Promise.all(
      rows.map(async (w): Promise<PublicWantlistEntry> => {
        const m = meta.get(w.card_id)
        const seeker = profiles.get(w.user_id) ?? null
        return {
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
          image: await resolveCardImage(w.set_id, w.number),
          username: seeker?.username ?? 'coleccionista',
          city: seeker?.city ?? null,
          country: seeker?.country ?? null,
          whatsapp_number: seeker?.whatsapp_number ?? null,
          created_at: w.created_at
        }
      })
    )

    return NextResponse.json({ wantlist })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}