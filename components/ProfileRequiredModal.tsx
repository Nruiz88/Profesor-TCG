'use client'

import { useState } from 'react'
import { isValidWhatsApp, type Profile } from '@/lib/profile'

interface ProfileRequiredModalProps {
  cardName?: string
  onComplete: (profile: Profile) => void
  onClose: () => void
}

// Modal progresivo: antes de poner una carta a la venta / generar un claim,
// pedimos el mínimo indispensable de contacto (WhatsApp + ciudad).
export default function ProfileRequiredModal({
  cardName,
  onComplete,
  onClose
}: ProfileRequiredModalProps) {
  const [whatsapp, setWhatsapp] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const wa = whatsapp.trim()
    if (!isValidWhatsApp(wa)) {
      setError('Ingresá tu número de WhatsApp con código de país (ej: 5492991234567)')
      return
    }
    if (city.trim() === '') {
      setError('Contanos tu ciudad para que los intercambios locales funcionen')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: wa,
          city: city.trim(),
          country: country.trim() === '' ? null : country.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onComplete(data.profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Completá tu perfil para vender"
      >
        <h2 className="text-lg font-semibold text-white">Un paso más para vender</h2>
        <p className="mt-1 text-sm text-slate-500">
          {cardName
            ? `Para publicar "${cardName}" y recibir claims por WhatsApp, completá estos datos.`
            : 'Para vender cartas y recibir claims por WhatsApp, completá estos datos.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Tu WhatsApp *</span>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="5492991234567"
              autoFocus
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
            <span className="mt-1 block text-[11px] text-slate-600">
              Con código de país. Solo vos lo ves; los compradores te escriben por un enlace wa.me.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Ciudad *</span>
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Ahora no
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-binder-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
