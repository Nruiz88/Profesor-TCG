import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Reputación pública de un usuario (rating, reseñas, transacciones,
// verificado, ubicación). Se sirve con service role porque la reputación es
// prueba social pública aunque el binder del usuario sea privado.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    const { data: profile, error } = await admin
      .from('profiles')
      .select(
        'id, username, city, country, total_sales, total_trades, rating_avg, is_verified'
      )
      .eq('username', username)
      .maybeSingle()
    if (error) throw error
    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const [{ count: reviewCount }, { count: completedClaims }] = await Promise.all([
      admin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed_user_id', profile.id),
      admin
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', profile.id)
        .eq('status', 'completed')
    ])

    return NextResponse.json({
      reputation: {
        username: profile.username,
        ratingAvg: (reviewCount ?? 0) > 0 ? Number(profile.rating_avg) : null,
        reviewCount: reviewCount ?? 0,
        totalSales: profile.total_sales ?? 0,
        totalTrades: profile.total_trades ?? 0,
        isVerified: !!profile.is_verified,
        city: profile.city ?? null,
        country: profile.country ?? null,
        completedClaims: completedClaims ?? 0
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
