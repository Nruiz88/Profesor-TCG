'use client'

import { useEffect, useState } from 'react'
import { REVIEW_TAGS } from '@/lib/reputation'
import { createReviewAction } from '@/app/actions/reviews'

interface ReviewModalProps {
  claimId: string
  reviewedUser: { id: string; username: string }
  cardName: string
  /** Rol del usuario que califica: comprador o vendedor */
  role: 'buyer' | 'seller'
  onClose: () => void
  onDone?: () => void
}

function Stars({
  value,
  onChange
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div className="flex items-center justify-center gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} estrella${n !== 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`text-3xl transition-transform hover:scale-110 ${
            n <= active ? 'text-yellow-400' : 'text-slate-700'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// Modal de confirmación + calificación: se dispara al pulsar
// "Confirmar Transacción". Envía la reseña con la server action
// createReviewAction (inserta review, cierra el claim, recalcula reputación).
export default function ReviewModal({
  claimId,
  reviewedUser,
  cardName,
  role,
  onClose,
  onDone
}: ReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  function toggleTag(id: string) {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError('Elegí una calificación de 1 a 5 estrellas.')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await createReviewAction({
      claimId,
      reviewedUserId: reviewedUser.id,
      rating,
      tags,
      comment
    })
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onDone?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Calificar transacción"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Confirmar transacción</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {role === 'buyer' ? 'Compraste' : 'Vendiste'}{' '}
          <span className="font-medium text-slate-300">{cardName}</span> con{' '}
          <span className="font-medium text-white">@{reviewedUser.username}</span>. ¿Cómo
          fue la experiencia?
        </p>

        {/* Calificación */}
        <div className="mt-5">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
            Calificación
          </p>
          <div className="mt-2">
            <Stars value={rating} onChange={setRating} />
          </div>
          <p className="mt-1 text-center text-xs text-slate-500">
            {rating > 0 ? `${rating} de 5 estrellas` : 'Tocá las estrellas para calificar'}
          </p>
        </div>

        {/* Chips de feedback rápido */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            ¿Qué destacás?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REVIEW_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                aria-pressed={tags.includes(t.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  tags.includes(t.id)
                    ? 'border-binder-accent/60 bg-binder-accent/15 text-rose-300'
                    : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comentario opcional */}
        <div className="mt-5">
          <label
            htmlFor="review-comment"
            className="block text-xs font-semibold uppercase tracking-widest text-slate-400"
          >
            Comentario (opcional)
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Contá cómo fue la experiencia…"
            className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-4 w-full rounded-xl bg-binder-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
        >
          {submitting ? 'Enviando reseña…' : '💬 Enviar reseña y confirmar'}
        </button>

        <p className="mt-3 text-center text-[11px] text-slate-600">
          Al confirmar, la transacción queda cerrada y tu calificación actualiza la
          reputación de {`@${reviewedUser.username}`}.
        </p>
      </div>
    </div>
  )
}
