import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { findWantlistMatches } from '@/lib/matchmaking'

export const dynamic = 'force-dynamic'

// Compara la wantlist del usuario autenticado (comprador) contra las cartas
// en venta (for_sale) del vendedor indicado. Usa service role para leer los
// binders del vendedor incluso si están privados.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sellerId = searchParams.get('sellerId')

  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!sellerId) {
    return NextResponse.json({ error: 'Falta sellerId' }, { status: 400 })
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