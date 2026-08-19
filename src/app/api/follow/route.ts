import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizePlainText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

interface FollowBody {
  username?: string
}

function parseBody(body: unknown): FollowBody {
  if (!body || typeof body !== 'object') return {}
  const b = body as Record<string, unknown>
  return {
    username: typeof b.username === 'string' ? b.username : undefined
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = sanitizePlainText(searchParams.get('username') ?? '').toLowerCase()

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const [{ count: followers }, { count: following }, relation] = await Promise.all([
    supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    user
      ? supabase
          .from('followers')
          .select('follower_id')
          .eq('following_id', profile.id)
          .eq('follower_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ])

  return NextResponse.json({
    isFollowing: !!relation?.data,
    followers: followers ?? 0,
    following: following ?? 0
  })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: FollowBody
  try {
    body = parseBody(await req.json())
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const username = sanitizePlainText(body.username ?? '').toLowerCase()
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }
    if (profile.id === user.id) {
      return NextResponse.json({ error: 'No podés seguirte a vos mismo' }, { status: 400 })
    }

    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: user.id, following_id: profile.id })
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya seguís a este usuario' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ ok: true, following: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: FollowBody
  try {
    body = parseBody(await req.json())
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const username = sanitizePlainText(body.username ?? '').toLowerCase()
  if (!/^[a-z0-9_.-]+$/.test(username)) {
    return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
    if (error) throw error

    return NextResponse.json({ ok: true, following: false })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}