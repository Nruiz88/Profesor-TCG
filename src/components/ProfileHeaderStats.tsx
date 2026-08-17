import { CardsIcon, TagIcon, SwapIcon, WalletIcon } from './icons'

interface ProfileHeaderStatsProps {
  totalCards: number
  totalValue: number
  saleCount: number
  tradeCount: number
}

// Estadísticas del perfil: total de cartas, valor acumulado (price /
// price_override / mercado) y cuántas están disponibles para venta o cambio.
export default function ProfileHeaderStats({
  totalCards,
  totalValue,
  saleCount,
  tradeCount
}: ProfileHeaderStatsProps) {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <CardsIcon className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Cartas</p>
        </div>
        <p className="mt-1 text-xl font-bold text-white">{totalCards}</p>
      </div>
      <div className="rounded-xl border border-yellow-400/20 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <WalletIcon className="h-3.5 w-3.5 text-yellow-400/60" />
          <p className="text-[10px] uppercase tracking-widest text-yellow-400/50">Valor total</p>
        </div>
        <p className="mt-1 text-xl font-bold text-yellow-400">
          ${fmt(totalValue)}{' '}
          <span className="text-xs font-semibold text-yellow-400/50">USD</span>
        </p>
      </div>
      <div className="rounded-xl border border-emerald-500/20 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <TagIcon className="h-3.5 w-3.5 text-emerald-500/60" />
          <p className="text-[10px] uppercase tracking-widest text-emerald-500/60">En venta</p>
        </div>
        <p className="mt-1 text-xl font-bold text-emerald-400">{saleCount}</p>
      </div>
      <div className="rounded-xl border border-sky-500/20 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <SwapIcon className="h-3.5 w-3.5 text-sky-500/60" />
          <p className="text-[10px] uppercase tracking-widest text-sky-500/60">Para cambio</p>
        </div>
        <p className="mt-1 text-xl font-bold text-sky-400">{tradeCount}</p>
      </div>
    </div>
  )
}
