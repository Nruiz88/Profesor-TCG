'use client'

import { useEffect, useState } from 'react'

// Alineado con src/middleware.ts: solo rutas que requieren sesión.
// /binder/[username] y /profile/[username] son públicas.
function isProtected(pathname: string) {
  return (
    pathname === '/binder' ||
    pathname === '/binder/' ||
    pathname === '/offers' ||
    pathname === '/admin'
  )
}

// Detecta sesión local SIN importar supabase-js (mantiene el bundle de la
// página offline mínimo). La clave default de auth-js v2 es 'supabase.auth.token';
// se soporta el formato legacy 'sb-<ref>-auth-token' como fallback.
function hasStoredSession() {
  if (typeof window === 'undefined') return false
  const storage = window.localStorage
  if (storage.getItem('supabase.auth.token')) return true
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return true
  }
  return false
}

export default function OfflinePage() {
  const [pathname, setPathname] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    setPathname(window.location.pathname)
    setHasSession(hasStoredSession())
  }, [])

  const protectedRoute = pathname !== null && isProtected(pathname)
  const showLogin = protectedRoute && !hasSession

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold text-white">Estás sin conexión</h1>

      {showLogin ? (
        <p className="max-w-md text-slate-400">
          Esta sección requiere iniciar sesión y necesitás internet para hacerlo. Cuando vuelvas a
          tener conexión, te redirigimos al login.
        </p>
      ) : (
        <p className="max-w-md text-slate-400">
          {protectedRoute
            ? 'Tu sesión está guardada, pero esta sección necesita internet para cargar los datos actualizados.'
            : 'La app funciona offline, pero este contenido requiere internet. Revisá tu conexión y volvé a intentar.'}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-rose-500 px-5 py-2 font-semibold text-white transition hover:bg-rose-400"
        >
          Reintentar
        </button>
        {showLogin && (
          <button
            type="button"
            onClick={() =>
              window.location.assign(`/login${pathname ? `?next=${encodeURIComponent(pathname)}` : ''}`)
            }
            className="rounded-lg border border-slate-600 px-5 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Ir al login
          </button>
        )}
      </div>
    </main>
  )
}