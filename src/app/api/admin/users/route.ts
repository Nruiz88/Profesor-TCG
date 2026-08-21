import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export const MAX_PAGE_SIZE = 50

// Listado paginado de usuarios para el panel admin: búsqueda por usuario o
// ubicación y paginación server-side (evita cargar toda la tabla en el cliente).
export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'No tenés permisos de administrador' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get('pageSize') || '15', 10) || 15)
  )
  // Se quitan los caracteres que rompen la sintaxis de filtros de PostgREST
  const q = (searchParams.get('search') || '').trim().replace(/[()\.,'"]/g, '')
  const offset = (page - 1) * pageSize

  try {
    let query = admin
      .from('profiles')
      .select('id, username, city, country, created_at, is_admin, is_verified', {
        count: 'exact'
      })
    if (q) {
      const like = `%${q}%`
      query = query.or(`username.ilike.${like},city.ilike.${like},country.ilike.${like}`)
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw error

    const rows = users || []
    const userIds = rows.map((u) => u.id)

    const binderByUser = new Map<string, { count: number; publicCount: number }>()
    const binderOwner = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: binders } = await admin
        .from('binders')
        .select('id, user_id, is_public')
        .in('user_id', userIds)
      for (const b of binders || []) {
        const acc = binderByUser.get(b.user_id) || { count: 0, publicCount: 0 }
        acc.count++
        if (b.is_public) acc.publicCount++
        binderByUser.set(b.user_id, acc)
        binderOwner.set(b.id, b.user_id)
      }

      const binderIds = [...binderOwner.keys()]
      const perUser = new Map<string, { cardCount: number; saleCount: number; tradeCount: number }>()
      if (binderIds.length > 0) {
        const { data: cards } = await admin
          .from('binder_cards')
          .select('binder_id, is_for_sale, is_for_trade')
          .in('binder_id', binderIds)
        for (const c of cards || []) {
          const uid = binderOwner.get(c.binder_id)
          if (!uid) continue
          const acc = perUser.get(uid) || { cardCount: 0, saleCount: 0, tradeCount: 0 }
          acc.cardCount++
          if (c.is_for_sale) acc.saleCount++
          if (c.is_for_trade) acc.tradeCount++
          perUser.set(uid, acc)
        }
      }

      return NextResponse.json({
        rows: rows.map((u) => {
          const bStats = binderByUser.get(u.id)
          const acc = perUser.get(u.id) || { cardCount: 0, saleCount: 0, tradeCount: 0 }
          return {
            id: u.id,
            username: u.username,
            city: u.city,
            country: u.country,
            created_at: u.created_at,
            is_admin: u.is_admin,
            is_verified: !!u.is_verified,
            binderCount: bStats?.count || 0,
            hasPublicBinder: (bStats?.publicCount || 0) > 0,
            cardCount: acc.cardCount,
            saleCount: acc.saleCount,
            tradeCount: acc.tradeCount
          }
        }),
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize))
      })
    }

    return NextResponse.json({
      rows: [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize))
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}