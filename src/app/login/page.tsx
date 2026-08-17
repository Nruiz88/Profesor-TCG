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

  // Inicializar desde la URL: ?mode=signup (link "Crear cuenta gratis") y
  // ?claim=<card_id> (venís de un claim anónimo → aplicamos la reserva acá).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
    setClaimId(params.get('claim'))
  }, [])

  // Destino tras iniciar sesión: respeta ?next= (del claim, del middleware…)
  // pero solo rutas internas — nunca URLs externas ni protocol-relative.
  function afterLoginPath(): string {
    if (typeof window === 'undefined') return '/binder'
    const next = new URLSearchParams(window.location.search).get('next')
    if (next && next.startsWith('/') && !next.startsWith('//')) return next
    return '/binder'
  }

  function appendQuery(url: string, query: string): string {
    return url + (url.includes('?') ? '&' : '?') + query
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

      // Si venís de un claim anónimo (?claim=<card_id>), aplicamos la reserva
      // ahora que hay sesión — así la persona no tiene que re-reclamar al volver.
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
          // Otros errores (401 sin sesión por confirmación de email, etc.):
          // la intención queda pendiente y el ClaimModal la reintenta al volver.
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <h1 className="text-2xl font-bold tracking-tight text-white">Profesor TCG</h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login' ? 'Iniciá sesión en tu binder privado' : 'Creá tu cuenta y tu binder privado'}
        </p>
        <Link href="/" className="mt-2 inline-block text-xs text-slate-600 hover:text-slate-300">
          ← Volver a la página principal
        </Link>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-binder-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {loading ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-4 text-sm text-slate-500 hover:text-slate-200"
        >
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  )
}