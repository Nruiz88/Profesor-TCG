'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-binder-sheet p-8 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
        <h1 className="text-2xl font-bold tracking-tight">Profesor TCG</h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === 'login' ? 'Iniciá sesión en tu binder privado' : 'Creá tu cuenta y tu binder privado'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-white/10 bg-binder-bg px-4 py-3 text-sm focus:border-binder-accent focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 6 caracteres)"
            className="w-full rounded-xl border border-white/10 bg-binder-bg px-4 py-3 text-sm focus:border-binder-accent focus:outline-none"
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
          className="mt-4 text-sm text-slate-400 hover:text-white"
        >
          {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
        </button>
      </div>
    </div>
  )
}