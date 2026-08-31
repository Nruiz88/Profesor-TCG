'use client'

import { memo } from 'react'
import dynamic from 'next/dynamic'
import { DiscordIcon } from '@/components/icons'

const RecentActivityTimeline = dynamic(() => import('@/components/RecentActivityTimeline'), {
  ssr: false
})

interface BinderSidebarProps {
  isGallery: boolean
  bindersCount: number
  binderSets: { set_id: string; count: number }[]
  saleCount: number
  tradeCount: number
}

function BinderSidebar({
  isGallery,
  bindersCount,
  binderSets,
  saleCount,
  tradeCount
}: BinderSidebarProps) {
  return (
    <aside className="w-full shrink-0 space-y-4 lg:w-64">
      {/* Progreso por Set — only when a binder is selected */}
      {!isGallery && binderSets.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <span className="text-[#00ffcc]">◉</span> Progreso por Set
          </h3>
          <div className="space-y-3">
            {binderSets.map((s) => (
              <div key={s.set_id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="truncate font-medium text-slate-300">{s.set_id.toUpperCase()}</span>
                  <span className="font-mono text-[#00ffcc]">{s.count}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                  <div
                    className="h-full rounded-full bg-[#00ffcc]/70 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
                    style={{ width: `${Math.max(6, (s.count / Math.max(1, binderSets[0].count)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
          <span className="text-[#00ffcc]">◉</span> {isGallery ? 'Resumen' : 'Estadísticas'}
        </h3>
        {isGallery ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total binders</span>
              <span className="font-mono text-lg font-bold text-[#00ffcc]">{bindersCount}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-950/60 p-3 text-center">
              <p className="text-xl font-extrabold text-emerald-400">{saleCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">En venta</p>
            </div>
            <div className="rounded-xl bg-slate-950/60 p-3 text-center">
              <p className="text-xl font-extrabold text-sky-400">{tradeCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cambios</p>
            </div>
          </div>
        )}
      </div>

      {!isGallery && <RecentActivityTimeline mode="own" limit={4} />}

      <a
        href="https://discord.gg/NxuWmFKPuZ"
        target="_blank"
        rel="noopener noreferrer"
        className="pulse-glow flex w-full items-center justify-center gap-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-4 text-sm font-bold text-[#5865F2] transition-all hover:bg-[#5865F2]/20 active:scale-[0.98]"
      >
        <DiscordIcon className="h-6 w-6" /> Unirme al Discord
      </a>
    </aside>
  )
}

export default memo(BinderSidebar)