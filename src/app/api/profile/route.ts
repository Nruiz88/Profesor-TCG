import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidWhatsApp } from '@/lib/profile'
import { sanitizePlainText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

// Username por defecto derivado del email (ej: niconqn88 -> niconqn88)
function defaultUsername(email: string | undefined): string {
  if (!email) return 'usuario'
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
  return base || 'usuario'
}

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
    // Buscamos el perfil; si no existe (usuarios viejos, anteriores al trigger),
    // lo creamos con username derivado del email.
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ profile: existing })
    }

    const username = defaultUsername(user.email)
    const { data: created, error } = await supabase
      .from('profiles')
      .insert({ id: user.id, username })
      .select()
      .single()

    if (error) {
      // Si el username por defecto ya está tomado, agregamos un sufijo
      if (error.code === '23505') {
        const { data: retry, error: retryError } = await supabase
          .from('profiles')
          .insert({ id: user.id, username: `${username}${Math.floor(Math.random() * 900 + 100)}` })
          .select()
          .single()
        if (retryError) throw retryError
        return NextResponse.json({ profile: retry })
      }
      throw error
    }

    return NextResponse.json({ profile: created })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: {
    username?: string
    whatsapp_number?: string | null
    country?: string | null
    city?: string | null
    favorite_energy?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  let missing: string | null = null

  // username: requerido, único (se sanitiza como texto plano antes de validar)
  if (body.username !== undefined) {
    const username = sanitizePlainText(body.username)
    if (username.length < 3 || username.length > 30) {
      missing = 'El nombre de usuario debe tener entre 3 y 30 caracteres'
    } else if (!/^[a-z0-9_.-]+$/i.test(username)) {
      missing = 'El nombre de usuario solo puede contener letras, números, punto, guion y _'
    } else {
      updates.username = username
    }
  }

  // whatsapp: opcional, solo dígitos
  if (body.whatsapp_number !== undefined) {
    const wa = body.whatsapp_number?.trim() ?? ''
    if (wa === '') {
      updates.whatsapp_number = null
    } else if (!isValidWhatsApp(wa)) {
      missing = 'El número de WhatsApp debe tener entre 8 y 15 dígitos (con código de país, ej: 549299XXXXXXX)'
    } else {
      updates.whatsapp_number = wa
    }
  }

  // Ubicación: libre, se neutraliza cualquier intento de markup.
  if (body.city !== undefined) updates.city = sanitizePlainText(body.city) || null
  if (body.country !== undefined) updates.country = sanitizePlainText(body.country) || null

  // Energía favorita: lista cerrada de tipos de energía (se guarda el id EN).
  if (body.favorite_energy !== undefined) {
    const e = body.favorite_energy?.trim() ?? ''
    const allowed = [
      'Fire', 'Water', 'Grass', 'Lightning', 'Psychic', 'Fighting',
      'Darkness', 'Metal', 'Fairy', 'Dragon', 'Colorless', 'Bug',
      'Poison', 'Electric', 'Ground', 'Rock', 'Ghost', 'Ice', 'Flying', 'Normal'
    ]
    updates.favorite_energy = allowed.includes(e) ? e : null
  }

  if (missing) {
    return NextResponse.json({ error: missing }, { status: 400 })
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin cambios para guardar' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ese nombre de usuario ya está en uso. Probá otro.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ profile: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
