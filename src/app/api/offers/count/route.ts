import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/offers/count — ofertas de intercambio PENDIENTES recibidas.
// Es el contador del badge del header ("Ofertas (2)"). Query liviana (head
// count, sin filas) sobre la misma tabla que la bandeja.
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { count, error } = await supabase
      .from('trade_offers')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    if (error) throw error

    return NextResponse.json({ pending: count ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
