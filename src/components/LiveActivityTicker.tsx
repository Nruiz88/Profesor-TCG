'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActivityItem, ActivityStatus } from '@/app/api/public/activity/route'
import { formatLocation } from '@/lib/profile'
import { ActivityIcon } from '@/components/icons'

const STATUS_META: Record<ActivityStatus, { icon: string; label: string; cls: string }> = {
  for_sale: { icon: '💵', label: 'puso en venta', cls: 'text-emerald-400' },
  for_trade: { icon: '🔄', label: 'ofrece en cambio', cls: 'text-sky-400' },
  reserved: { icon: '🔒', label: 'reservó', cls: 'text-amber-400' }
}

// Cintillo de actividad en vivo: marquee infinito (CSS, pausa al hover) con la
// última actividad del marketplace. Si no hay actividad o falla la API, se
// oculta sin romper la home.
export default function LiveActivityTicker() {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/activity?limit=24')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (active) setItems(data.items || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  if (error || items === null || items.length === 0) return null

  // Duplicamos la lista para el loop infinito (-50% de translateX)
  const loop = [...items, ...items]

  return (
    <section
      aria-label="Actividad reciente de la comunidad"
      className="flex items-stretch overflow-hidden border-y border-slate-800/60 bg-slate-950"
    >
      <span className="z-10 flex shrink-0 items-center gap-2 border-r border-slate-800/60 bg-slate-900/80 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-binder-accent">
        <ActivityIcon width={14} height={14} />
        Actividad
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-marquee flex w-max items-center">
          {loop.map((it, i) => {
            const meta = STATUS_META[it.status]
            return (
              <Link
                key={`${it.id}-${i}`}
                href={`/explore?q=${encodeURIComponent(it.card_name)}`}
                className="flex items-center gap-2 whitespace-nowrap py-3 pl-6 text-sm text-slate-400 transition-colors hover:text-white"
              >
                <span className="text-xs">{meta.icon}</span>
                <span className="font-semibold text-slate-300">@{it.username}</span>
                <span>{meta.label}</span>
                <span className="font-semibold text-white">{it.card_name}</span>
                {it.price != null && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-400">
                    ${it.price.toFixed(2)}
                  </span>
                )}
                {formatLocation(it.city, it.country) && (
                  <span className="text-xs text-slate-500">
                    · {formatLocation(it.city, it.country)}
                  </span>
                )}
                <span className="ml-2 h-1 w-1 rounded-full bg-slate-700" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
