import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  apiKeyInfo,
  deleteApiKey,
  isKnownApiKey,
  listApiKeys,
  setApiKey
} from '@/lib/apiKeys'
import { pokeWalletTest } from '@/lib/pokeWallet'
import { tcgApiTest } from '@/lib/tcgApi'
import { pokeTraceTest } from '@/lib/pokeTrace'

export const dynamic = 'force-dynamic'

// Integraciones / API keys: listado enmascarado, guardado, prueba y borrado.
// Solo perfiles con is_admin = true. Las claves nunca salen del servidor:
// el GET solo devuelve máscaras y el POST no devuelve el valor guardado.
async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { user: null, error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return {
      user,
      error: NextResponse.json({ error: 'No tenés permisos de administrador' }, { status: 403 })
    }
  }
  return { user, error: null }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const integrations = await listApiKeys()
    return NextResponse.json({ integrations })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface SettingsBody {
  action?: string
  name?: string
  value?: string
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  let body: SettingsBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const name = body.name ?? ''
  if (!isKnownApiKey(name)) {
    return NextResponse.json({ error: 'Integración desconocida' }, { status: 400 })
  }

  try {
    if (body.action === 'test') {
      if (name === 'pokewallet_api_key') {
        const result = await pokeWalletTest()
        return NextResponse.json({
          ok: result.ok,
          detail: result.detail,
          budget: result.budget
        })
      }
      if (name === 'tcgapi_key') {
        const result = await tcgApiTest()
        return NextResponse.json({
          ok: result.ok,
          detail: result.detail
        })
      }
      if (name === 'poketrace_key') {
        const result = await pokeTraceTest()
        return NextResponse.json({
          ok: result.ok,
          detail: result.detail,
          budget: result.budget
        })
      }
      return NextResponse.json({ ok: false, detail: 'Sin prueba disponible' })
    }

    if (body.action === 'delete') {
      await deleteApiKey(name)
      return NextResponse.json({ ok: true })
    }

    // action === 'set' (default)
    const info = apiKeyInfo(name)
    const value = (body.value ?? '').trim()
    if (!value) {
      return NextResponse.json({ error: 'Ingresá la clave' }, { status: 400 })
    }
    if (info?.pattern && !info.pattern.test(value)) {
      return NextResponse.json(
        { error: `Formato inválido: ${info.patternHint}` },
        { status: 400 }
      )
    }

    await setApiKey(name, value, user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
