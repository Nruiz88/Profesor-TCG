'use client'

import { useEffect, useState } from 'react'
import type { ExpansionData } from '@/src/services/expansions'

interface ExpansionHeaderProps {
  setId: string
  className?: string
}

interface ExpansionApiResponse {
  expansion: ExpansionData
  ownedCount: number | null
}

// Iniciales para el placeholder temático cuando el logo no carga
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// Placeholder temático con el nombre estilizado (reemplaza al logo caído)
function LogoPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex h-12 w-40 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-gradient-to-br from-rose-500/15 via-slate-800/60 to-sky-500/15">
      <span className="px-2 text-sm font-bold tracking-tight text-slate-200">
        {initials(name) || 'TCG'}
      </span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="h-12 w-40 shrink-0 animate-pulse rounded-xl bg-slate-800" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800/70" />
        <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-slate-800" />
      </div>
    </div>
  )
}

// Header resiliente de expansión: logo HD + símbolo oficial con esqueletos de
// carga mientras resuelve la promesa Multi-API, y barra de progreso de la
// colección del usuario (ej. 142 / 165 cartas · 86%). Si una imagen no carga
// (onError), se reemplaza por un placeholder temático con el nombre estilizado.
export default function ExpansionHeader({ setId, className = '' }: ExpansionHeaderProps) {
  const [data, setData] = useState<ExpansionData | null>(null)
  const [ownedCount, setOwnedCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [logoFailed, setLogoFailed] = useState(false)
  const [symbolFailed, setSymbolFailed] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLogoFailed(false)
    setSymbolFailed(false)
    fetch(`/api/expansions/${encodeURIComponent(setId)}`)
      .then(async (res) => {
        const json = (await res.json()) as ExpansionApiResponse
        if (!active) return
        if (!res.ok) throw new Error('Error al cargar la expansión')
        setData(json.expansion)
        setOwnedCount(json.ownedCount)
      })
      .catch(() => {
        // Fallback mínimo: seguimos mostrando el setId, sin romper el modal
        if (active) {
          setData(null)
          setOwnedCount(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [setId])

  if (loading) return <Skeleton />

  const name = data?.name ?? setId
  const total = data?.totalCards ?? 0
  const owned = ownedCount ?? 0
  const hasProgress = ownedCount !== null && total > 0
  const pct = hasProgress ? Math.min(100, Math.round((owned / total) * 100)) : 0

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      <div className="flex items-center gap-4">
        {/* Logo HD con placeholder temático en caso de error */}
        {!logoFailed && data?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.logoUrl}
            alt={`Logo de ${name}`}
            className="h-12 w-40 shrink-0 object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <LogoPlaceholder name={name} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-base font-bold tracking-tight text-white">{name}</h3>
            {!symbolFailed && data?.symbolUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.symbolUrl}
                alt={`Símbolo de ${name}`}
                className="h-6 w-6 shrink-0 object-contain"
                onError={() => setSymbolFailed(true)}
              />
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[data?.series, data?.releaseDate ? `Salida: ${data.releaseDate}` : '']
              .filter(Boolean)
              .join(' · ') || `${total > 0 ? `${total} cartas` : 'Expansión'}`}
          </p>
        </div>
      </div>

      {/* Barra de progreso de la colección del usuario */}
      {hasProgress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              {owned} / {total} cartas
            </span>
            <span className="font-bold text-rose-400">{pct}%</span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={owned}
            aria-label={`Progreso de colección: ${pct}%`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : (
        total > 0 && (
          <p className="mt-3 text-xs text-slate-600">
            {total} cartas en la expansión · Iniciá sesión para ver tu progreso de colección.
          </p>
        )
      )}
    </div>
  )
}
