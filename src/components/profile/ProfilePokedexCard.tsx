'use client'

import { memo } from 'react'
import { pokedexLevel } from '@/lib/pokedex'

interface ProfilePokedexCardProps {
  captured: number
  total: number
}

function ProfilePokedexCard({ captured, total }: ProfilePokedexCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-400/25 text-xl ring-1 ring-rose-400/30">
            ⚡
          </span>
          <div>
            <p className="text-sm font-bold text-white">Pokédex capturada</p>
            <p className="text-xs text-slate-400">{captured} de {total} Pokémon</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300">
          {pokedexLevel(captured).icon} {pokedexLevel(captured).name}
        </span>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={captured}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
          style={{ width: `${Math.min(100, (captured / total) * 100)}%` }}
        />
      </div>
    </div>
  )
}

export default memo(ProfilePokedexCard)