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
      className="modal-overlay z-50"
      onClick={onClose}
    >
      <div
        className="modal-card modal-card--md"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? 'Crear carpeta' : `Configurar ${binder.title}`}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isCreate ? 'Nueva carpeta' : 'Configurar carpeta'}
          </h2>
          <button onClick={onClose} className="modal-close">
            Cerrar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="binder-title" className="field-label">
              Nombre
            </label>
            <input
              id="binder-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              placeholder="Ej: Mi colección"
              className="field mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="binder-desc" className="field-label">
              Descripción (opcional)
            </label>
            <textarea
              id="binder-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ej: Cartas de mi infancia, hago trueques…"
              className="field mt-1.5 resize-none"
            />
            <p className="field-hint text-right">{description.length}/300</p>
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
              <label htmlFor="binder-cover" className="field-label">
                Carta de portada
              </label>
              <select
                id="binder-cover"
                value={coverCardId}
                onChange={(e) => setCoverCardId(e.target.value)}
                className="field mt-1.5 text-slate-200"
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
          <p className="banner banner--error mt-4">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-claim btn-claim--compact btn-claim--ghost"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-claim btn-claim--compact btn-claim--accent"
          >
            {saving ? 'Guardando…' : isCreate ? 'Crear carpeta' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
