'use client'

import { memo } from 'react'
import WantlistSlot from '@/components/binder/WantlistSlot'
import type { WantlistCard } from '@/types/wantlist'

interface ProfileWantlistSectionProps {
  entries: WantlistCard[]
  offerUrlFor?: (w: WantlistCard) => string | null
}

// Sección "Buscadas" del perfil público. `offerUrlFor` se usa solo cuando el
// visitante está logueado y tiene la carta (deep link al swap).
function ProfileWantlistSection({ entries, offerUrlFor }: ProfileWantlistSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-rose-500/50 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center gap-3">
        <h4 className="text-lg font-bold text-rose-300">Buscadas</h4>
        <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
          {entries.length} ítem{entries.length !== 1 ? 's' : ''}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No agregó cartas a su lista de buscadas todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {entries.map((w) => (
            <WantlistSlot key={w.id} entry={w} offerUrl={offerUrlFor?.(w) ?? undefined} />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(ProfileWantlistSection)