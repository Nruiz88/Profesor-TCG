'use client'

import { useMemo, useState } from 'react'

const RANGES = ['1D', '1M', '3M', '6M', '1Y'] as const
type Range = (typeof RANGES)[number]

// Serie pseudoaleatoria determinística basada en el valor actual: no hay
// historial real por ahora, así que el gráfico muestra una curva de tendencia
// estable (se regenera solo al cambiar de rango o valor).
function sparklinePoints(value: number, range: Range, n = 30): number[] {
  const seed = Math.round(value * 100) || 42
  let s = (seed % 2147483647) + 1
  const rand = () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
  const volatility: Record<Range, number> = {
    '1D': 0.004,
    '1M': 0.03,
    '3M': 0.06,
    '6M': 0.1,
    '1Y': 0.18
  }
  const base = Math.max(1, value * (1 - volatility[range]))
  const pts: number[] = []
  let cur = base
  for (let i = 0; i < n; i++) {
    cur += (rand() - 0.48) * value * volatility[range] * 0.5
    cur = Math.max(1, cur)
    pts.push(cur)
  }
  pts[n - 1] = value
  return pts
}

function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Card "— VALOR ESTIMADO DEL PORTAFOLIO": total del inventario en USD con
 * variación, selector de rango (1D–1Y) tipo retro-cyber y gráfico de área.
 */
export default function PortfolioValueCard({ value }: { value: number }) {
  const [range, setRange] = useState<Range>('1M')
  const points = useMemo(() => sparklinePoints(value, range), [value, range])

  const W = 320
  const H = 96
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1

  const coords = points.map((p, i) => [
    (i / (points.length - 1)) * W,
    H - ((p - min) / span) * (H - 14) - 7
  ])

  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const last = coords[coords.length - 1]

  const isFlat = value <= 0

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ffcc]/80">
        — Valor Estimado del Portafolio
      </p>

      <div className="mt-3 flex items-end gap-2">
        <p className="text-4xl font-extrabold tracking-tight text-white">
          ${fmtUsd(value)}
        </p>
        <span className="mb-1.5 font-mono text-xs font-semibold uppercase text-white/50">
          USD
        </span>
      </div>

      <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
        <span>▲ +$0.00 USD</span>
        <span className="font-normal text-slate-500">({range})</span>
      </p>

      {/* Selector de rango retro-cyber */}
      <div className="mt-4 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={`rounded-lg border px-3 py-1 font-mono text-[11px] font-bold tracking-widest transition-all ${
              range === r
                ? 'border-[#00ffcc]/60 bg-[#00ffcc]/15 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.25)]'
                : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Gráfico de historial (área) */}
      <div className="mt-4 flex-1">
        {isFlat ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-600">
            Sin inventario cargado
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-24 w-full"
            role="img"
            aria-label={`Historial de valor del portafolio (${range})`}
          >
            <defs>
              <linearGradient id="pf-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#pf-gradient)" />
            <path
              d={line}
              fill="none"
              stroke="#00ffcc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={last[0]}
              cy={last[1]}
              r="3.5"
              fill="#00ffcc"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,204,0.8))' }}
            />
          </svg>
        )}
      </div>
    </div>
  )
}