import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Marca/desmarca el badge ⚡ VERIFICADO de un usuario (solo admin).
export async function PATCH(req: Request) {
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

  let body: { user_id?: unknown; is_verified?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }
  if (typeof body.user_id !== 'string' || typeof body.is_verified !== 'boolean') {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) {
    return NextResponse.json({ error: 'Servicio no disponible' }, { status: 500 })
  }
  const admin = createAdminClient(url, serviceKey)

  try {
    const { data, error } = await admin
      .from('profiles')
      .update({ is_verified: body.is_verified })
      .eq('id', body.user_id)
      .select('id, username, is_verified')
      .single()
    if (error) throw error
    return NextResponse.json({ ok: true, profile: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
