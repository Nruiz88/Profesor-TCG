'use client'

import { useEffect, useState } from 'react'
import WantlistGrid from '@/components/WantlistGrid'
import type { PublicWantlistEntry } from '@/app/api/public/wantlist/route'

function SkeletonTile() {
  return (
    <div>
      <div className="shimmer mb-1.5 h-4 w-1/2 rounded" />
      <div className="overflow-hidden rounded-xl border border-fuchsia-500/20 bg-slate-950">
        <div className="shimmer aspect-[63/88] rounded-t-xl" />
        <div className="space-y-2 p-2.5">
          <div className="shimmer h-3 w-3/4 rounded" />
          <div className="shimmer h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>
  )
}

/**
 * Galería en vivo de la wantlist de la comunidad para la home: las últimas
 * cartas que alguien está buscando. Si el visitante tiene sesión, WantlistGrid
 * arma el deep link de WhatsApp "¡Yo la tengo!" apuntando a su binder.
 */
export default function LiveWantlistFeed() {
  const [entries, setEntries] = useState<PublicWantlistEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/public/wantlist?limit=12')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (active) setEntries(data.wantlist || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return null

  return (
    <div>
      {entries === null ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-fuchsia-500/30 bg-slate-900 px-6 py-14 text-center">
          <p className="text-lg font-semibold text-white">La comunidad todavía no busca cartas</p>
          <p className="mt-1 text-sm text-slate-500">
            Agregá las cartas que estás buscando desde tu Binder y aparecen acá para que otros
            coleccionistas te ofrezcan un Swap por WhatsApp.
          </p>
        </div>
      ) : (
        <WantlistGrid entries={entries} compact />
      )}
    </div>
  )
}