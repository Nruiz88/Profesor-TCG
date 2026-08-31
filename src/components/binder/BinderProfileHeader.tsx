'use client'

import { memo } from 'react'
import { CardsIcon, PlusIcon } from '@/components/icons'
import type { TrainerScore } from '@/lib/trainer'
import type { Profile } from '@/lib/profile'

interface BinderProfileHeaderProps {
  profile: Profile | null
  isVerified: boolean
  trainerScore: TrainerScore | null
  bindersCount: number
  onCreate: () => void
}

function BinderProfileHeader({
  profile,
  isVerified,
  trainerScore,
  bindersCount,
  onCreate
}: BinderProfileHeaderProps) {
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00ffcc]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800 bg-gradient-to-tr from-[#00ffcc]/30 via-violet-500/20 to-rose-500/30 text-3xl font-black text-white shadow-[0_0_30px_rgba(0,255,204,0.35)]">
              {(profile?.username?.[0] ?? 'B').toUpperCase()}
            </div>
            <div className="absolute -inset-1.5 rounded-full border border-[#00ffcc]/25" />
            {isVerified && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ffcc] text-xs font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.6)]">
                ✓
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-white">
                {profile?.username ?? 'Mis Binders'}
              </h1>
              {trainerScore && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  <span className="text-sm">{trainerScore.rank.icon}</span> {trainerScore.rank.name}
                </span>
              )}
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  ⚡ Verificado
                </span>
              )}
            </div>
            {trainerScore && trainerScore.nextRank && (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 w-32 overflow-hidden rounded-full border border-slate-700/50 bg-slate-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_8px_rgba(241,193,0,0.4)]"
                    style={{ width: `${Math.round(trainerScore.progress * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  {trainerScore.xp.toLocaleString('en-US')} XP · {trainerScore.nextRank.icon} {trainerScore.nextRank.name}
                </span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <CardsIcon className="h-4 w-4 text-[#00ffcc]" />
                <span className="font-semibold text-white">{bindersCount}</span>
                binder{bindersCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00ffcc] px-4 py-2 text-sm font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all hover:brightness-110"
          >
            <PlusIcon width={15} height={15} />
            Crear nuevo binder
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(BinderProfileHeader)