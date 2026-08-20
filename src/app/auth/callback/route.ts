import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ============================================================================
// /auth/callback — completar el flujo OAuth (Google, etc.)
// Supabase redirige aquí con un `code` de una sola vez. Intercambiamos ese
// código por una sesión y setamos las cookies de sesión en la respuesta.
//
// El perfil del usuario se crea solo vía el trigger `on_auth_user_created`
// (ver migración 002_profiles.sql): con Google el email viene en la cuenta.
//
// Respeta el parámetro `next` para devolver al usuario al destino original
// tras el login (p. ej. el binder, una oferta, un claim pendiente).
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Se llama desde el Server Component; el middleware ya refrescó.
            }
          }
        }
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // El destino original se guardó en la cookie oauth_next antes de ir a
      // Google (ver login/page.tsx handleGoogle). Leerlo de la cookie evita
      // incrustar query params en el redirectTo de Supabase.
      const rawNext = cookieStore.get('oauth_next')?.value
      const next = rawNext ? decodeURIComponent(rawNext) : null
      const redirectTo = next && next.startsWith('/') && !next.startsWith('//')
        ? next
        : '/binder'

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const target = isLocalEnv
        ? `${origin}${redirectTo}`
        : forwardedHost
          ? `https://${forwardedHost}${redirectTo}`
          : `${origin}${redirectTo}`
      return NextResponse.redirect(target)
    }
  }

  // Error o falta el código: volver al login.
  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
