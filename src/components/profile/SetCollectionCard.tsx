'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { WantlistCard } from '@/types/wantlist'
import { slugify } from '@/lib/utils'

interface SetCollectionCardProps {
  setId: string
  setName: string
  series: string
  owned: number
  total: number
  percentage: number
  logoUrl: string | null
  /** Cartas deseadas (wantlist) en este set */
  wanted: WantlistCard[]
}

/**
 * Tarjeta de set expandible: logo grande del set con el contador de cartas.
 * Al hacer click se despliega mostrando las cartas deseadas (wantlist) de ese set.
 */
export default function SetCollectionCard({
  setId,
  setName,
  owned,
  total,
  percentage,
  logoUrl,
  wanted
}: SetCollectionCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
      {/* Header: logo grande + stats + chevron */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 p-4 transition-colors hover:bg-white/[0.02]"
      >
        {/* Logo del set */}
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${setName}`}
              className="h-full w-full object-contain p-1"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
              {setName.slice(0, 2).toUpperCase()}
            </div>
          )}
          {/* Badge de porcentaje */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 rounded-tl-lg px-1.5 py-0.5 text-[9px] font-bold ${
              percentage >= 100
                ? 'bg-emerald-500 text-white'
                : percentage >= 50
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-700 text-slate-200'
            }`}
          >
            {percentage}%
          </span>
        </div>

        {/* Stats */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{setName}</p>
          <div className="mt-1 flex items-center gap-3 font-mono text-[11px]">
            <span className="text-[#00ffcc]">
              {owned}/{total} únicas
            </span>
            <span className="text-slate-500">
              {owned} total
            </span>
            {wanted.length > 0 && (
              <span className="text-fuchsia-400">
                ✨ {wanted.length} deseada{wanted.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Barra de progreso */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : percentage >= 50
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                    : percentage >= 20
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-slate-600 to-slate-500'
              }`}
              style={{ width: `${Math.max(percentage, 2)}%` }}
            />
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Contenido expandido: cartas deseadas del set */}
      {expanded && wanted.length > 0 && (
        <div className="border-t border-slate-800/60 p-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-400/80">
            ✨ Buscando en este set
          </p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {wanted.map((w) => (
              <Link
                key={w.id}
                href={`/carta/${encodeURIComponent(w.card_id)}/${slugify(w.card_name)}`}
                className="group/card relative block"
              >
                <div className="aspect-[2.5/3.5] overflow-hidden rounded-xl border border-dashed border-fuchsia-500/30 bg-slate-800/30 transition-colors group-hover/card:border-fuchsia-400/60">
                  {w.image ? (
                    <img
                      src={w.image}
                      alt={w.card_name}
                      className="h-full w-full object-cover opacity-70 transition-opacity group-hover/card:opacity-100"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-2xl text-slate-600">
                      ✨
                    </div>
                  )}
                </div>
                <p className="mt-1 truncate text-center text-[10px] text-fuchsia-400 transition-colors group-hover/card:text-fuchsia-300">
                  #{w.number} {w.card_name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
