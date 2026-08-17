'use client'

import { useEffect, useState } from 'react'
import { isValidWhatsApp, whatsAppLink, type Profile } from '@/lib/profile'
import { fetchJson } from '@/lib/utils'

// Campos editables del perfil público (los que ve la comunidad). Tipo
// estructural: la página de perfil los pasa desde ProfileInfo.
export interface EditableProfileFields {
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
}

interface ProfileEditFormProps {
  profile: EditableProfileFields | null
  onSaved?: (profile: Profile) => void
}

// Formulario de datos del perfil: nombre de usuario, WhatsApp y ubicación.
// Antes vivía en un modal (ProfileSettings); ahora es una sección individual
// de la página de perfil propio, cargada de forma lazy.
export default function ProfileEditForm({ profile, onSaved }: ProfileEditFormProps) {
  const [username, setUsername] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setUsername(profile?.username ?? '')
    setWhatsapp(profile?.whatsapp_number ?? '')
    setCity(profile?.city ?? '')
    setCountry(profile?.country ?? '')
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validación en cliente (misma reglas que /api/profile)
    const trimmed = username.trim()
    if (trimmed.length < 3 || trimmed.length > 30) {
      setError('El nombre de usuario debe tener entre 3 y 30 caracteres')
      return
    }
    if (!/^[a-z0-9_.-]+$/i.test(trimmed)) {
      setError('El nombre de usuario solo puede contener letras, números, punto, guion y _')
      return
    }
    const wa = whatsapp.trim()
    if (wa !== '' && !isValidWhatsApp(wa)) {
      setError('El número de WhatsApp debe tener entre 8 y 15 dígitos (con código de país)')
      return
    }

    setSaving(true)
    try {
      const saved = await fetchJson<{ profile: Profile }>('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmed,
          whatsapp_number: wa === '' ? null : wa,
          city: city.trim() === '' ? null : city.trim(),
          country: country.trim() === '' ? null : country.trim()
        })
      })
      onSaved?.(saved.profile)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-400">Nombre de usuario *</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="tunombre"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
        />
        <span className="mt-1 block text-[11px] text-slate-600">
          Aparecerá como @{username || 'tu-usuario'} en tu ficha pública.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-400">
          WhatsApp (para que te contacten)
        </span>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="5492991234567"
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
        />
        <span className="mt-1 block text-[11px] text-slate-600">
          Solo dígitos, con código de país (ej: 549299XXXXXXX para Argentina).
        </span>
        {whatsapp && isValidWhatsApp(whatsapp) && (
          <span className="mt-1 block text-[11px] text-emerald-400">
            Enlace: {whatsAppLink(whatsapp)}
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Ciudad</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Neuquén"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">País</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Argentina"
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
          Perfil guardado ✓
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-binder-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar perfil'}
      </button>
    </form>
  )
}
