'use client'

import { memo } from 'react'
import Link from 'next/link'
import { REVIEW_TAGS } from '@/lib/reputation'
import type { ProfileReview } from './UserProfileView'

const KIND_LABEL: Record<string, string> = {
  sale: '🛒 Compra',
  trade: '🔄 Intercambio',
  both: '🔄 Venta e intercambio'
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex text-sm text-amber-400" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? '' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`
  return `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) !== 1 ? 's' : ''}`
}

interface ProfileReviewsSectionProps {
  username: string
  reviews: ProfileReview[]
}

// Sección de reseñas del perfil público. Extraída para no duplicar el markup
// entre desktop y mobile (misma lista, distinto contenedor).
function ProfileReviewsSection({ username, reviews }: ProfileReviewsSectionProps) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between border-b border-slate-800/60 pb-4">
        <h3 className="flex items-center gap-2.5 text-xl font-bold text-white">
          <span className="text-2xl">⭐</span>
          Reseñas
        </h3>
      </div>
      {reviews.length === 0 ? (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 px-6 py-16 text-center backdrop-blur-xl">
          <p className="text-3xl">⭐</p>
          <p className="mt-3 text-lg font-semibold text-white">Sin reseñas todavía</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando @{username} complete transacciones, sus compradores van a poder dejar su opinión acá.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const tagLabels = review.tags
              .map((t) => REVIEW_TAGS.find((rt) => rt.id === t)?.label)
              .filter((l): l is string => !!l)
            return (
              <article
                key={review.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl transition-colors hover:border-slate-700"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-sm font-bold text-white shadow">
                    {(review.reviewer?.username[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    {review.reviewer ? (
                      <p className="truncate text-sm">
                        <Link
                          href={`/profile/${encodeURIComponent(review.reviewer.username)}`}
                          className="font-semibold text-white transition-colors hover:text-rose-300"
                        >
                          @{review.reviewer.username}
                        </Link>{' '}
                        <span className="text-slate-500">dejó una reseña</span>
                      </p>
                    ) : (
                      <p className="truncate text-sm">
                        <span className="font-semibold text-white">Un comprador</span>{' '}
                        <span className="text-slate-500">dejó una reseña</span>
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {review.kind && KIND_LABEL[review.kind] && (
                        <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {KIND_LABEL[review.kind]}
                        </span>
                      )}
                      <time dateTime={review.createdAt} title={formatDate(review.createdAt)} className="text-xs text-slate-500">
                        {timeAgo(review.createdAt)}
                      </time>
                    </p>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {review.comment}
                  </p>
                )}

                {tagLabels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tagLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[10px] font-medium text-slate-300"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default memo(ProfileReviewsSection)