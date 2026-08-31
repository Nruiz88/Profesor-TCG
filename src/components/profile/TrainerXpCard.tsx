'use client'

import { memo } from 'react'
import type { TrainerScore } from '@/lib/trainer'

interface TrainerXpCardProps {
  score: TrainerScore
  compact?: boolean
}

// Panel de rango + XP del entrenador. `compact` es para el mobile (barra más
// fina y sin detalle de borde). Se reutiliza en desktop y mobile del perfil.
function TrainerXpCard({ score, compact = false }: TrainerXpCardProps) {
  return (
    <div className={compact ? '' : 'rounded-xl border border-slate-800 bg-slate-950/50 p-4'}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Rango actual
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-amber-300">
            <span className="text-xl">{score.rank.icon}</span>
            {score.rank.name}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Total XP
          </p>
          <p className="mt-0.5 text-lg font-bold text-white">
            {score.xp.toLocaleString('en-US')} XP
          </p>
        </div>
      </div>
      {score.nextRank && (
        <>
          <div
            className={`${compact ? 'mt-3 h-2.5' : 'mt-3 h-3'} w-full overflow-hidden rounded-full border border-slate-700/50 bg-slate-900`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(score.progress * 100)}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_12px_rgba(241,193,0,0.5)]"
              style={{ width: `${Math.round(score.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-right font-mono text-[10px] text-slate-500">
            Siguiente rango: {score.nextRank.icon} {score.nextRank.name}
          </p>
        </>
      )}
    </div>
  )
}

export default memo(TrainerXpCard)