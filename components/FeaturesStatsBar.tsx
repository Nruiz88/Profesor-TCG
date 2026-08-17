'use client'

import { useEffect, useRef, useState } from 'react'
import { CardsIcon, UserIcon, TagIcon } from '@/components/icons'

interface Stats {
  catalogCards: number
  users: number | null
  sellers: number
  activeListings: number
}

// Contador animado con easing al entrar en viewport
function useCountUp(target: number, active: boolean, duration = 1400): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return value
}

const fmtInt = (v: number) => Math.round(v).toLocaleString('es-AR')

// Franja de stats de la sección de características: cartas indexadas,
// coleccionistas y ofertas activas, con contador animado al hacer scroll.
export default function FeaturesStatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/public/stats')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (active) setStats(data)
      })
      .catch(() => {
        // Si falla la API, la franja se oculta sin romper la landing
      })
    return () => {
      active = false
    }
  }, [])

  const statsReady = stats !== null
  useEffect(() => {
    if (!statsReady) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [statsReady])

  const cards = useCountUp(stats?.catalogCards ?? 0, inView)
  const collectors = useCountUp(stats?.users ?? stats?.sellers ?? 0, inView, 1100)
  const offers = useCountUp(stats?.activeListings ?? 0, inView, 1100)

  if (stats === null) return null

  const items = [
    {
      icon: CardsIcon,
      value: fmtInt(cards),
      label: 'Cartas indexadas',
      accent: 'text-sky-400'
    },
    {
      icon: UserIcon,
      value: fmtInt(collectors),
      label:
        stats?.users != null ? 'Coleccionistas registrados' : 'Coleccionistas publicando',
      accent: 'text-amber-400'
    },
    {
      icon: TagIcon,
      value: fmtInt(offers),
      label: 'Ofertas activas',
      accent: 'text-emerald-400'
    }
  ]

  return (
    <div
      ref={ref}
      className="mt-12 grid gap-4 sm:grid-cols-3"
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur transition-colors hover:border-slate-600"
        >
          <span className={`shrink-0 ${it.accent}`}>
            <it.icon width={26} height={26} strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-bold tabular-nums tracking-tight text-white">
              {it.value}
            </p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {it.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
