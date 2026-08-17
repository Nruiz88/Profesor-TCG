import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export interface AppNotification {
  id: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  created_at: string
}

// GET /api/notifications — últimas notificaciones del usuario + no leídas.
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
    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, payload, read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
    ])
    if (error) throw error

    return NextResponse.json({
      notifications: (data || []) as AppNotification[],
      unread: count ?? 0
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
