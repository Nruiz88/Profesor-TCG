'use client'

import type { TrainerScore } from '@/lib/trainer'

// Tarjeta de Puntos de Entrenador del perfil público: XP total, rango,
// barra de progreso al siguiente rango y desglose por actividad.
export default function TrainerScoreCard({ score }: { score: TrainerScore }) {
  const { breakdown } = score
  const rows = [
    { icon: '⚡', label: 'Especies capturadas', part: breakdown.captures },
    { icon: '🛒', label: 'Ventas completadas', part: breakdown.sales },
    { icon: '🔄', label: 'Cambios completados', part: breakdown.trades },
    { icon: '📥', label: 'Compras completadas', part: breakdown.buys },
    { icon: '⭐', label: 'Reseñas recibidas', part: breakdown.reviews }
  ]

  return (
    <div className="mb-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      {/* Cabecera: rango + XP */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-rose-400/25 text-xl ring-1 ring-fuchsia-400/30">
            🏆
          </span>
          <div>
            <p className="text-sm font-bold text-white">Puntos de Entrenador</p>
            <p className="text-xs text-slate-400">
              {score.xp.toLocaleString('en-US')} XP acumuladas
              {score.remainingXp != null && (
                <span className="text-slate-500">
                  {' '}
                  · {score.remainingXp.toLocaleString('en-US')} XP para subir
                </span>
              )}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-300">
          {score.rank.icon} {score.rank.name}
        </span>
      </div>

      {/* Barra de progreso al siguiente rango */}
      {score.nextRank && (
        <>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(score.progress * 100)}
            aria-label={`Progreso hacia ${score.nextRank.name}`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-400 transition-all duration-500"
              style={{ width: `${Math.round(score.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[10px] text-slate-500">
            Siguiente rango: {score.nextRank.icon} {score.nextRank.name}
          </p>
        </>
      )}

      {/* Desglose por actividad */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {rows.map((r) => (
          <div
            key={r.label}
            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {r.icon} {r.label}
            </p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {r.part.count.toLocaleString('en-US')}
              <span className="ml-1.5 text-[10px] font-semibold text-fuchsia-300/80">
                {r.part.xp.toLocaleString('en-US')} XP
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
