'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActivityItem, ActivityStatus } from '@/app/api/public/activity/route'
import type { OwnActivityItem, OwnActivityKind } from '@/app/api/binder/activity/route'
import { formatLocation } from '@/lib/profile'
import { ActivityIcon } from '@/components/icons'

// ── Meta por estado (comunidad) ─────────────────────────────────────
const STATUS_META: Record<ActivityStatus, { dot: string; icon: string; text: string; label: string }> = {
  for_sale: {
    dot: 'border-emerald-400',
    icon: '💵',
    text: 'text-emerald-400',
    label: 'puso en venta'
  },
  for_trade: {
    dot: 'border-sky-400',
    icon: '🔄',
    text: 'text-sky-400',
    label: 'ofrece en cambio'
  },
  reserved: {
    dot: 'border-amber-400',
    icon: '🔒',
    text: 'text-amber-400',
    label: 'reservó'
  }
}

// ── Meta por estado (binder propio) ─────────────────────────────────
const OWN_META: Record<OwnActivityKind, { dot: string; icon: string; text: string; label: string }> = {
  added: {
    dot: 'border-[#00ffcc]',
    icon: '＋',
    text: 'text-[#00ffcc]',
    label: 'Agregaste'
  },
  for_sale: {
    dot: 'border-emerald-400',
    icon: '💵',
    text: 'text-emerald-400',
    label: 'En venta'
  },
  for_trade: {
    dot: 'border-sky-400',
    icon: '🔄',
    text: 'text-sky-400',
    label: 'En cambio'
  },
  reserved: {
    dot: 'border-amber-400',
    icon: '🔒',
    text: 'text-amber-400',
    label: 'Reservada'
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

type TimelineEntry =
  | { source: 'own'; item: OwnActivityItem }
  | { source: 'community'; item: ActivityItem }

// Timeline de actividad reciente, estilo el diseño "Perfil Binder": puntos de
// color con línea vertical, texto de la acción y tiempo relativo.
//   mode="own"        → actividad del usuario logueado (/api/binder/activity)
//   mode="community"  → actividad del marketplace (/api/public/activity)
// Módulo reutilizable.
export default function RecentActivityTimeline({
  mode = 'own',
  limit = 8,
  title = 'Actividad Reciente'
}: {
  mode?: 'own' | 'community'
  limit?: number
  title?: string
}) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    const url =
      mode === 'own'
        ? `/api/binder/activity?limit=${limit}`
        : `/api/public/activity?limit=${limit}`
    fetch(url)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (!active) return
        const items: TimelineEntry[] =
          mode === 'own'
            ? (data.items || []).map((item: OwnActivityItem) => ({ source: 'own', item }))
            : (data.items || []).map((item: ActivityItem) => ({ source: 'community', item }))
        setEntries(items)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [mode, limit])

  if (error || entries === null || entries.length === 0) return null

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
        <ActivityIcon className="h-4 w-4 text-[#00ffcc]" />
        {title}
      </h3>

      <div className="relative flex flex-col gap-4 before:absolute before:inset-y-1 before:left-[11px] before:w-px before:bg-slate-800">
        {entries.map((entry) => {
          if (entry.source === 'own') {
            const meta = OWN_META[entry.item.kind]
            const href = `/binder?card=${encodeURIComponent(entry.item.id)}`
            return (
              <Link key={entry.item.id} href={href} className="group relative flex gap-4">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-slate-900 ${meta.dot} z-10`}
                >
                  <span className="text-[10px]">{meta.icon}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-slate-300">
                    <span className={`font-bold ${meta.text}`}>{meta.label}</span>{' '}
                    <span className="font-semibold text-slate-200">{entry.item.card_name}</span>
                    <span className="text-slate-500">
                      {' '}
                      · {entry.item.set_id.toUpperCase()} #{entry.item.number}
                    </span>
                    {entry.item.price != null && (
                      <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                        ${entry.item.price.toFixed(2)}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{timeAgo(entry.item.updated_at)}</p>
                </div>
              </Link>
            )
          }

          const meta = STATUS_META[entry.item.status]
          return (
            <Link
              key={entry.item.id}
              href={`/?q=${encodeURIComponent(entry.item.card_name)}`}
              className="group relative flex gap-4"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-slate-900 ${meta.dot} z-10`}
              >
                <span className="text-[10px]">{meta.icon}</span>
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-slate-300">
                  <span className="font-semibold text-slate-200">@{entry.item.username}</span>{' '}
                  <span className="text-slate-400">{meta.label}</span>{' '}
                  <span className={`font-bold ${meta.text}`}>{entry.item.card_name}</span>
                  {entry.item.price != null && (
                    <span className="ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                      ${entry.item.price.toFixed(2)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {timeAgo(entry.item.updated_at)}
                  {formatLocation(entry.item.city, entry.item.country)
                    ? ` · ${formatLocation(entry.item.city, entry.item.country)}`
                    : ''}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}