import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  // IMPORTANTE: NO ejecutar código entre createServerClient y supabase.auth.getUser()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas protegidas: el binder privado (/binder), la bandeja de ofertas
  // (/offers) y las API privadas. /binder/[username] es la ficha pública
  // y debe poder verse sin sesión.
  const isPrivateBinder = pathname === '/binder' || pathname === '/binder/'
  if (
    !user &&
    (isPrivateBinder ||
      pathname === '/offers' ||
      pathname === '/admin' ||
      pathname.startsWith('/api/binder') ||
      pathname.startsWith('/api/offers') ||
      pathname.startsWith('/api/admin') ||
      pathname === '/api/profile')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Si hay usuario y va a /login, ir al binder
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/binder'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}