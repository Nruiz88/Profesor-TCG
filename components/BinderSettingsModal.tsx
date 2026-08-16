'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'

export interface BinderValues {
  title: string
  description: string | null
  isPublic: boolean
  coverCardId: string | null
}

interface BinderSettingsModalProps {
  binder: { id: string; title: string; description?: string | null; is_public?: boolean; cover_card_id?: string | null } | null
  cards?: SlotCard[]
  onSave: (values: BinderValues) => Promise<void>
  onClose: () => void
}

// Modal de administración de carpetas: sirve tanto para crear un binder nuevo
// (binder = null) como para editar el actual (título, descripción, privacidad
// y carta de portada).
export default function BinderSettingsModal({
  binder,
  cards = [],
  onSave,
  onClose
}: BinderSettingsModalProps) {
  const isCreate = binder === null
  const [title, setTitle] = useState(binder?.title ?? '')
  const [description, setDescription] = useState(binder?.description ?? '')
  const [isPublic, setIsPublic] = useState(binder?.is_public ?? false)
  const [coverCardId, setCoverCardId] = useState(binder?.cover_card_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (title.trim() === '') {
      setError('Escribí un nombre para la carpeta.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        isPublic,
        coverCardId: coverCardId === '' ? null : coverCardId
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? 'Crear carpeta' : `Configurar ${binder.title}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isCreate ? 'Nueva carpeta' : 'Configurar carpeta'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="binder-title" className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Nombre
            </label>
            <input
              id="binder-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="Ej: Mi colección"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="binder-desc" className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Descripción (opcional)
            </label>
            <textarea
              id="binder-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ej: Cartas de mi infancia, hago trueques…"
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-600">{description.length}/300</p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 accent-emerald-500"
            />
            <span>
              <span className="block text-sm font-medium text-slate-200">Carpeta pública</span>
              <span className="block text-xs text-slate-500">
                Cualquiera con el link puede verla (y aparece en el marketplace si tiene cartas en venta/cambio).
              </span>
            </span>
          </label>

          {!isCreate && cards.length > 0 && (
            <div>
              <label htmlFor="binder-cover" className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
                Carta de portada
              </label>
              <select
                id="binder-cover"
                value={coverCardId}
                onChange={(e) => setCoverCardId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:border-binder-accent focus:outline-none"
              >
                <option value="">Automática (primera en venta/cambio)</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} ({c.set_id.toUpperCase()} {c.number})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-binder-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : isCreate ? 'Crear carpeta' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
