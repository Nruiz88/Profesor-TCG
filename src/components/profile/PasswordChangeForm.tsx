'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KeyIcon } from '@/components/icons'

// Cambio de contraseña de la cuenta. Verifica la contraseña actual con
// signInWithPassword (para que un sesión robada no pueda cambiarla sin saber
// la clave) y después actualiza con updateUser. Sección individual de la
// página de perfil propio, cargada de forma lazy.
export default function PasswordChangeForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (next.length < 6) {
      setError('La contraseña nueva debe tener al menos 6 caracteres')
      return
    }
    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user?.email) {
        throw new Error('No se pudo leer tu cuenta')
      }

      // Verificamos la contraseña actual antes de cambiarla
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current
      })
      if (verifyError) {
        throw new Error('La contraseña actual es incorrecta')
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: next })
      if (updateError) throw updateError

      setSuccess(true)
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <KeyIcon className="h-4 w-4 text-binder-accent" />
        Cambiar contraseña
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        Usala para acceder a tu binder y cerrar tus transacciones.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Contraseña actual
          </span>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">
              Contraseña nueva
            </span>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="Mín. 6 caracteres"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">
              Repetir contraseña nueva
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
          </label>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
            Contraseña actualizada ✓
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-50"
        >
          {saving ? 'Actualizando…' : 'Actualizar contraseña'}
        </button>
      </form>
    </section>
  )
}
