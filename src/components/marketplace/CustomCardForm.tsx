'use client'

import { useEffect, useState } from 'react'
import { CARD_LANGUAGES, normalizeLanguage, type CardLanguage } from '@/lib/cardLanguage'
import { sanitizeCardTitle, sanitizePlainText } from '@/lib/sanitize'
import { createCustomCardAction } from '@/app/actions/customCards'

interface CustomCardFormProps {
  /** Binder destino. Si no se pasa, se resuelve el binder por defecto del usuario. */
  binderId?: string
  onCreated?: (cardId: string) => void
}

// Formulario de ejemplo para crear una carta NO catalogada (Custom Card).
// Defensa en profundidad sobre el escape automático de React 19:
//   - El preview muestra la entrada SANITIZADA en nodos de texto JSX ({text}),
//     nunca con dangerouslySetInnerHTML.
//   - La Server Action createCustomCardAction vuelve a sanitizar en el servidor
//     justo antes del .insert() (autoridad final sobre lo que se persiste).
export default function CustomCardForm({ binderId, onCreated }: CustomCardFormProps) {
  const [binder, setBinder] = useState<string | null>(binderId ?? null)
  const [cardName, setCardName] = useState('')
  const [setId, setSetId] = useState('')
  const [number, setNumber] = useState('')
  const [language, setLanguage] = useState<CardLanguage>('ES')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)

  // Si no recibimos binderId, resolvemos el binder por defecto del usuario.
  useEffect(() => {
    if (binderId) {
      setBinder(binderId)
      return
    }
    let active = true
    fetch('/api/binder')
      .then(async (res) => {
        if (!res.ok) throw new Error('Sin binder disponible')
        const body = await res.json()
        if (active && body.binder?.id) setBinder(body.binder.id)
      })
      .catch(() => {
        if (active) setError('Iniciá sesión para crear cartas personalizadas.')
      })
    return () => {
      active = false
    }
  }, [binderId])

  // Vista previa sanitizada (lo que se enviará y guardará).
  const previewName = sanitizeCardTitle(cardName)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreated(null)

    if (!binder) {
      setError('Todavía no hay un binder disponible.')
      return
    }
    if (!previewName) {
      setError('Escribí un nombre de carta válido.')
      return
    }

    setSubmitting(true)
    const result = await createCustomCardAction({
      binderId: binder,
      cardName: previewName,
      setId: sanitizePlainText(setId),
      number: sanitizePlainText(number),
      language: normalizeLanguage(language)
    })
    setSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    setCreated(result.cardId)
    onCreated?.(result.cardId)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
    >
      <h2 className="text-sm font-semibold text-white">Agregar carta personalizada</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        ¿Tu carta no está en el catálogo? Agregala a tu binder con un nombre libre.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="cc-name"
            className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
          >
            Nombre de la carta
          </label>
          <input
            id="cc-name"
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            maxLength={80}
            placeholder="Ej: Charizard Festival"
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
          {/* Preview en nodo de texto JSX: React escapa cualquier intento de markup. */}
          {previewName && (
            <p className="mt-1 text-xs text-slate-500">
              Se guardará como: <span className="font-medium text-slate-300">{previewName}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="cc-set"
              className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Expansión
            </label>
            <input
              id="cc-set"
              type="text"
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              maxLength={40}
              placeholder="Ej: sv4a"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="cc-number"
              className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Número
            </label>
            <input
              id="cc-number"
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              maxLength={20}
              placeholder="Ej: 125/197"
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="cc-lang"
            className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
          >
            Idioma de la copia
          </label>
          <select
            id="cc-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as CardLanguage)}
            className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-binder-accent focus:outline-none"
          >
            {CARD_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}
      {created && (
        <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Carta personalizada creada.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !binder}
        className="mt-4 w-full rounded-xl bg-binder-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
      >
        {submitting ? 'Guardando…' : '+ Agregar al binder'}
      </button>
    </form>
  )
}