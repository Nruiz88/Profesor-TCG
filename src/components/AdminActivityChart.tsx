'use client'

export interface ActivityPoint {
  date: string // YYYY-MM-DD
  count: number
}

interface AdminActivityChartProps {
  data: ActivityPoint[]
}

const fmtDay = (date: string) => {
  try {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit'
    })
  } catch {
    return date
  }
}

// Gráfico de barras simple de cartas agregadas por día. Puro CSS (sin librería
// de charts): la altura de cada barra es proporcional al pico del período y el
// tooltip nativo muestra el conteo exacto.
export default function AdminActivityChart({ data }: AdminActivityChartProps) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const peak = Math.max(1, ...data.map((d) => d.count))

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">Cartas agregadas por día</h3>
          <p className="text-xs text-slate-500">Últimos 14 días</p>
        </div>
        <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300">
          {total} cartas · pico {peak}/día
        </span>
      </div>

      <div className="flex h-36 items-end gap-1.5">
        {data.map((d, i) => {
          const pct = Math.max(4, Math.round((d.count / peak) * 100))
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 items-end"
              title={`${fmtDay(d.date)}: ${d.count} carta${d.count !== 1 ? 's' : ''}`}
            >
              <div
                className={`w-full rounded-t-md bg-gradient-to-t from-rose-600 to-amber-400 transition-all ${
                  d.count === 0 ? 'opacity-25' : 'opacity-90 group-hover:opacity-100'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>

      {/* Eje X: etiquetas cada dos días para no saturar */}
      <div className="mt-2 flex gap-1.5 border-t border-slate-800 pt-2">
        {data.map((d, i) => (
          <span
            key={d.date}
            className={`flex-1 text-center text-[10px] text-slate-600 ${
              i % 2 === 0 ? '' : 'text-transparent'
            }`}
          >
            {fmtDay(d.date)}
          </span>
        ))}
      </div>
    </section>
  )
}
