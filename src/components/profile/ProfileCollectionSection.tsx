'use client'

import { memo } from 'react'
import SetCollectionCard from './SetCollectionCard'
import type { SetCollection } from './UserProfileView'
import type { WantlistCard } from '@/types/wantlist'

interface ProfileCollectionSectionProps {
  sets: SetCollection[]
  totalCardCount: number
  setLogos: Record<string, string>
  wantedBySet: Map<string, WantlistCard[]>
}

// Sección "Colección" del perfil: progreso por set. Reutilizada en desktop y
// mobile (cambia solo la cantidad de sets mostrados según el ancho).
function ProfileCollectionSection({
  sets,
  totalCardCount,
  setLogos,
  wantedBySet
}: ProfileCollectionSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-amber-400/40 bg-slate-900/40 p-6 backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h4 className="text-lg font-bold text-white">Colección</h4>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
          {sets.length} set{sets.length !== 1 ? 's' : ''}
        </span>
        <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
          {totalCardCount} carta{totalCardCount !== 1 ? 's' : ''}
        </span>
      </div>
      {sets.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          Todavía no tiene cartas en su binder.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sets.slice(0, 8).map((sc) => (
            <SetCollectionCard
              key={sc.setId}
              setId={sc.setId}
              setName={sc.setName}
              series={sc.series}
              owned={sc.owned}
              total={sc.total}
              percentage={sc.percentage}
              logoUrl={setLogos[sc.setId] ?? null}
              wanted={wantedBySet.get(sc.setId) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(ProfileCollectionSection)