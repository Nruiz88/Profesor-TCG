'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearPendingClaim } from '@/lib/pendingClaim'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [claimId, setClaimId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
    setClaimId(params.get('claim'))
  }, [])

  function afterLoginPath(): string {
    if (typeof window === 'undefined') return '/binder'
    const next = new URLSearchParams(window.location.search).get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) return next
    return '/binder'
  }

  function appendQuery(url: string, query: string): string {
    return url + (url.includes('?') ? '&' : '?') + query
  }

  async function handleGoogle() {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    let dest = afterLoginPath()
    if (claimId) dest = appendQuery(dest, 'claim=' + encodeURIComponent(claimId))

    // Guarda el destino en una cookie para que el callback (/auth/callback) lo
    // lea tras el OAuth. El redirectTo de Supabase debe ser una URL limpia:
    // no puede llevar query params propios o no matchea la lista blanca de
    // Redirect URLs del dashboard.
    document.cookie = `oauth_next=${encodeURIComponent(dest)}; path=/; max-age=600; SameSite=Lax`

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google')
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }

      let dest = afterLoginPath()
      if (claimId) {
        try {
          const res = await fetch('/api/claims', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_id: claimId })
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok && !data.requiresLogin) {
            dest = appendQuery(dest, 'claim_applied=1')
            clearPendingClaim()
          } else if (res.status === 409) {
            dest = appendQuery(dest, 'claim_taken=1')
            clearPendingClaim()
          }
        } catch {
          // La reserva se puede reintentar desde la carta.
        }
      }
      router.push(dest)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo - Arte Pokémon (oculto en mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1a1c2e] via-[#0f1923] to-[#0a0e17]">
        {/* Patrón de fondo decorativo */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-red-500/30 blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-blue-500/20 blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 w-56 h-56 rounded-full bg-yellow-500/15 blur-[90px]" />
        </div>
        
        {/* Contenido central */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          {/* Logo */}
          <img
            src="/brand/logo.png"
            alt="TCG Claim"
            className="mb-8 h-32 w-auto"
          />
          
          <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
            TCG Claim
          </h2>
          <p className="text-slate-400 text-center max-w-sm leading-relaxed">
            Tu binder digital de Pokémon. Coleccioná, intercambiá y vendé cartas con efectos holográficos reales.
          </p>
          
          {/* Stats decorativos */}
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white">151+</div>
              <div className="text-xs text-slate-500 mt-1">Sets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">16K+</div>
              <div className="text-xs text-slate-500 mt-1">Cartas</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Free</div>
              <div className="text-xs text-slate-500 mt-1">Para siempre</div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-[#0a0c10]">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img src="/brand/logo.png" alt="TCG Claim" className="h-12 w-auto mr-3" />
            <span className="text-xl font-bold text-white">TCG Claim</span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Bienvenido' : 'Creá tu cuenta'}
            </h1>
            <p className="mt-2 text-slate-500">
              {mode === 'login' 
                ? 'Iniciá sesión para acceder a tu binder' 
                : 'Unite a la comunidad de coleccionistas'}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0c10] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                mode === 'login' ? 'Ingresar' : 'Crear cuenta'
              )}
            </button>
          </form>

          {/* Separador OAuth */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-800/50" />
            <span className="text-xs text-slate-600">o continuá con</span>
            <div className="h-px flex-1 bg-slate-800/50" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-4 w-full py-3.5 px-4 rounded-xl font-semibold text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0c10] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {loading ? 'Redirigiendo...' : 'Continuar con Google'}
          </button>

          {/* Toggle login/signup */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError(null)
              }}
              className="text-sm text-slate-500 hover:text-white transition-colors"
            >
              {mode === 'login' ? (
                <>¿No tenés cuenta? <span className="text-red-400 font-medium">Registrate</span></>
              ) : (
                <>¿Ya tenés cuenta? <span className="text-red-400 font-medium">Ingresá</span></>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <Link 
              href="/"
              className="flex items-center justify-center text-sm text-slate-600 hover:text-slate-400 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
