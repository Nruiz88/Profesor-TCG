'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ReputationInfo } from '@/lib/reputation'
import { formatReputationLocation, levelBadge } from '@/lib/reputation'

interface SellerReputationCardProps {
  /** username del vendedor (null mientras carga o sin dueño) */
  username?: string | null
  className?: string
}

// Avatar con iniciales del username (sin imágenes de perfil todavía)
function Avatar({ username, verified }: { username: string; verified: boolean }) {
  const initial = (username[0] ?? '?').toUpperCase()
  return (
    <div className="relative shrink-0">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-sky-500/30 text-lg font-bold text-white ring-1 ring-slate-700">
        {initial}
      </div>
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow-lg"
          title="Verificado"
        >
          ⚡
        </span>
      )}
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xl">
      <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-40 animate-pulse rounded bg-slate-800/70" />
      </div>
      <div className="h-10 w-24 shrink-0 animate-pulse rounded-xl bg-slate-800" />
    </div>
  )
}

// Tarjeta de reputación del vendedor: prueba social para transacciones por
// WhatsApp. Carga su propia data pública (/api/reputation/[username]).
export default function SellerReputationCard({
  username,
  className = ''
}: SellerReputationCardProps) {
  const [reputation, setReputation] = useState<ReputationInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!username) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/reputation/${encodeURIComponent(username)}`)
      .then(async (res) => {
        const body = await res.json()
        if (!active) return
        if (res.ok && body.reputation) setReputation(body.reputation)
      })
      .catch(() => {
        if (active) setReputation(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [username])

  if (loading) return <Skeleton />
  if (!reputation) return null

  const level = levelBadge(reputation)
  const location = formatReputationLocation(reputation.city, reputation.country)

  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 backdrop-blur-xl sm:flex-row sm:items-center ${className}`}
    >
      <Avatar username={reputation.username} verified={reputation.isVerified} />

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          <Link
            href={`/profile/${encodeURIComponent(reputation.username)}`}
            className="transition-colors hover:text-rose-300"
            title="Ver perfil público"
          >
            @{reputation.username}
          </Link>
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
          {reputation.ratingAvg != null ? (
            <span className="flex items-center gap-1 font-bold text-yellow-400">
              ★ {reputation.ratingAvg.toFixed(1)}
              <span className="font-normal text-slate-500">
                ({reputation.reviewCount} reseña{reputation.reviewCount !== 1 ? 's' : ''})
              </span>
            </span>
          ) : (
            <span className="text-slate-500">Sin reseñas aún</span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-slate-400">📍 {location}</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {reputation.completedClaims > 0 && (
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-400">
              +{reputation.completedClaims}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              Claims exitosos
            </p>
          </div>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
            level.icon === '⚡'
              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
              : level.icon === '🏆'
                ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                : 'bg-slate-800 text-slate-300'
          }`}
        >
          <span aria-hidden>{level.icon}</span>
          {level.label}
        </span>
      </div>
    </div>
  )
}
