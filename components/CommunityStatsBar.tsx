'use client'

import { useEffect, useRef, useState } from 'react'
import { CardsIcon, WalletIcon, UserIcon } from '@/components/icons'

interface Stats {
  catalogCards: number
  marketValue: number
  sellers: number
}

// Contador animado con easing al entrar en viewport
function useCountUp(target: number, active: boolean, duration = 1500): number {
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
const fmtMoney = (v: number) =>
  v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function CommunityStatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)
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
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  // La barra renderiza null hasta que llegan las stats, así que el observer se
  // monta recién cuando el elemento existe (depende de statsReady).
  const statsReady = stats !== null && !error
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
      { threshold: 0.35 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [statsReady])

  // Los hooks se llaman siempre (regla de hooks); el early-return va después.
  const cards = useCountUp(stats?.catalogCards ?? 0, inView)
  const value = useCountUp(stats?.marketValue ?? 0, inView)
  const sellers = useCountUp(stats?.sellers ?? 0, inView, 1100)

  // Si falla la API, la barra se oculta sin romper la landing
  if (error || stats === null) return null

  const items = [
    {
      icon: CardsIcon,
      value: `${fmtInt(cards)}`,
      label: 'Cartas en el catálogo',
      accent: 'text-sky-400'
    },
    {
      icon: WalletIcon,
      value: `$${fmtMoney(value)}`,
      label: 'Valor del mercado en vivo',
      accent: 'text-emerald-400'
    },
    {
      icon: UserIcon,
      value: fmtInt(sellers),
      label: 'Coleccionistas publicando',
      accent: 'text-amber-400'
    }
  ]

  return (
    <section className="border-y border-slate-800/60 bg-slate-900/60">
      <div
        ref={ref}
        className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-slate-800/60 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
      >
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-4 px-4 py-6 sm:justify-center">
            <span className={`shrink-0 ${it.accent}`}>
              <it.icon width={28} height={28} strokeWidth={1.6} />
            </span>
            <div>
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
    </section>
  )
}
