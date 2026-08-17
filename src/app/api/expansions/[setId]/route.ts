import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getExpansionData } from '@/services/expansions'

export const dynamic = 'force-dynamic'

// Datos de una expansión (logo HD, símbolo, total de cartas) resueltos con el
// servicio Multi-API resiliente + cuántas cartas únicas del set tiene el
// usuario logueado (para la barra de progreso de colección).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ setId: string }> }
) {
  const { setId } = await params

  try {
    const expansion = await getExpansionData(setId)

    // Conteo de colección: cartas únicas del set en todos los binders del usuario
    let ownedCount: number | null = null
    try {
      const supabase = await createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (user) {
        const { data: binders } = await supabase
          .from('binders')
          .select('id')
          .eq('user_id', user.id)
        const ids = (binders || []).map((b) => b.id)
        if (ids.length > 0) {
          const { data: owned } = await supabase
            .from('binder_cards')
            .select('card_id')
            .in('binder_id', ids)
            .eq('set_id', setId)
          ownedCount = new Set((owned || []).map((c) => c.card_id)).size
        }
      }
    } catch {
      // Sin sesión o error de RLS: la barra de progreso simplemente no se muestra
      ownedCount = null
    }

    return NextResponse.json({ expansion, ownedCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
