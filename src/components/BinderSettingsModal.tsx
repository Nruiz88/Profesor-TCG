'use client'

import { useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import { BINDER_BACKGROUNDS, binderBackgroundByKey } from '@/lib/binderBackgrounds'

export interface BinderValues {
  title: string
  description: string | null
  isPublic: boolean
  coverCardId: string | null
  background: string | null
}

interface BinderSettingsModalProps {
  binder: { id: string; title: string; description?: string | null; is_public?: boolean; cover_card_id?: string | null; background?: string | null } | null
  cards?: SlotCard[]
  isPremium?: boolean
  onSave: (values: BinderValues) => Promise<void>
  onClose: () => void
}

export default function BinderSettingsModal({
  binder,
  cards = [],
  isPremium = false,
  onSave,
  onClose
}: BinderSettingsModalProps) {
  const isCreate = binder === null
  const [title, setTitle] = useState(binder?.title ?? '')
  const [description, setDescription] = useState(binder?.description ?? '')
  const [isPublic, setIsPublic] = useState(binder?.is_public ?? false)
  const [coverCardId, setCoverCardId] = useState(binder?.cover_card_id ?? '')
  const [background, setBackground] = useState(binder?.background ?? '')
  
  const [activeTab, setActiveTab] = useState<'details' | 'design'>('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedBg = binderBackgroundByKey(background)
  const previewUrl = selectedBg?.url ?? BINDER_BACKGROUNDS[0]?.url ?? ''

  async function handleSave() {
    if (title.trim() === '') {
      setError('Escribi un nombre para la carpeta.')
      setActiveTab('details')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() === '' ? null : description.trim(),
        isPublic,
        coverCardId: coverCardId === '' ? null : coverCardId,
        background: background === '' ? null : background
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? 'Crear carpeta' : `Personalizar ${binder.title}`}
      >
        {/* ─── Header: Preview & Tabs ─── */}
        <div className="relative shrink-0 border-b border-slate-800/80">
          {/* Banner con preview del fondo */}
          <div className="relative h-32 w-full overflow-hidden sm:h-40">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/40 to-slate-950/95" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />

            {/* Titulo superpuesto */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
              <span className="mb-1 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-fuchsia-300 backdrop-blur-md">
                {isCreate ? 'Nuevo Binder' : 'Personalizar Binder'}
              </span>
              <h2 className="max-w-full truncate text-2xl font-extrabold text-white drop-shadow-lg sm:text-3xl">
                {title.trim() === '' ? 'Mi Coleccion' : title}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-slate-300 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Navegacion por pestañas */}
          <div className="flex px-4 pt-2 sm:px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`relative pb-3 pt-2 text-sm font-bold transition-colors ${
                activeTab === 'details' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              } mr-8`}
            >
              📝 Detalles
              {activeTab === 'details' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('design')}
              className={`relative pb-3 pt-2 text-sm font-bold transition-colors ${
                activeTab === 'design' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ✨ Diseño & Fondo
              {activeTab === 'design' && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
              )}
            </button>
          </div>
        </div>

        {/* ─── Contenido ─── */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'details' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="binder-title" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Nombre del Binder
                  </label>
                  <input
                    id="binder-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={60}
                    placeholder="Ej: Mi coleccion principal"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-fuchsia-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                  />
                </div>

                {!isCreate && cards.length > 0 && (
                  <div>
                    <label htmlFor="binder-cover" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Carta de portada
                    </label>
                    <select
                      id="binder-cover"
                      value={coverCardId}
                      onChange={(e) => setCoverCardId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white transition-colors focus:border-fuchsia-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                    >
                      <option value="">Automatica (primera de la lista)</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.card_name} ({c.set_id.toUpperCase()} {c.number})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="binder-desc" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Descripcion (opcional)
                </label>
                <textarea
                  id="binder-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Contale a otros sobre tu coleccion..."
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-500 transition-colors focus:border-fuchsia-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                />
                <p className="mt-1 text-right text-[10px] text-slate-500">{description.length}/300</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <div className="flex h-5 items-center">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-fuchsia-500 focus:ring-fuchsia-500 focus:ring-offset-slate-900"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-white">Hacer publico</span>
                    <span className="mt-1 block text-xs text-slate-400 leading-relaxed">
                      Si esta activo, cualquiera con el enlace podra ver tu binder.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'design' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
              {!isPremium && (
                <div className="relative flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <span className="text-2xl">★</span>
                  <div>
                    <p className="text-sm font-bold text-amber-300">Función Premium</p>
                    <p className="text-xs text-amber-400/70">Desbloqueá fondos exclusivos para personalizar el fondo de tus binders.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Seleccioná un fondo</h3>
                  <p className="text-xs text-slate-400">Personalizá cómo se ve tu binder por detrás.</p>
                </div>
                {isPremium && background !== '' && (
                  <button
                    type="button"
                    onClick={() => setBackground('')}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    Restaurar automático
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {/* Opción automática */}
                <button
                  type="button"
                  onClick={() => isPremium && setBackground('')}
                  disabled={!isPremium}
                  className={`group relative flex aspect-[3/2] flex-col items-center justify-center overflow-hidden rounded-xl border-2 transition-all ${
                    background === ''
                      ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(217,70,239,0.2)]'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                  } ${!isPremium ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span className="text-2xl transition-transform group-hover:scale-110">🎲</span>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Rotacion Auto
                  </span>
                  {background === '' && isPremium && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] text-white">
                      ✓
                    </div>
                  )}
                </button>

                {/* Fondos */}
                {BINDER_BACKGROUNDS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => isPremium && setBackground(b.key)}
                    disabled={!isPremium}
                    className={`group relative aspect-[3/2] overflow-hidden rounded-xl border-2 transition-all ${
                      background === b.key && isPremium
                        ? 'border-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.3)]'
                        : 'border-slate-800 opacity-80 hover:border-slate-500 hover:opacity-100'
                    } ${!isPremium ? 'cursor-not-allowed' : ''}`}
                    title={b.label}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${b.url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />
                    <span className="absolute inset-x-0 bottom-0 p-2 text-center text-[11px] font-bold text-white drop-shadow-md">
                      {b.label}
                    </span>
                    {!isPremium && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/90 text-[10px] text-white shadow-lg">
                        ★
                      </div>
                    )}
                    {background === b.key && isPremium && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(217,70,239,0.8)]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 sm:mx-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800/80 p-4 sm:px-6 sm:py-5 bg-slate-900/50">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-400 transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center min-w-[140px] rounded-xl bg-fuchsia-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all hover:bg-fuchsia-400 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isCreate ? 'Crear carpeta' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
