import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { findWantlistMatches } from '@/lib/matchmaking'
import { validate, extractParams } from '@/lib/validate'
import { matchmakingSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// Compara la wantlist del usuario autenticado (comprador) contra las cartas
// en venta (for_sale) del vendedor indicado. Usa service role para leer los
// binders del vendedor incluso si están privados.
export async function GET(req: Request) {
  const params = validate(matchmakingSchema, extractParams(req))
  if (params.error) return params.error
  const { sellerId } = params.data

  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    const { data: seller } = await admin
      .from('profiles')
      .select('username')
      .eq('id', sellerId)
      .maybeSingle()

    const matches = await findWantlistMatches(user.id, sellerId, admin)

    return NextResponse.json({
      matches,
      count: matches.length,
      sellerUsername: seller?.username ?? null
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}