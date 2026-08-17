'use client'

import { CardsIcon, SparklesIcon } from '@/components/icons'

export type BinderTab = 'collection' | 'wantlist'

interface BinderTabsProps {
  active: BinderTab
  onChange: (tab: BinderTab) => void
  wantlistCount?: number
}

export default function BinderTabs({ active, onChange, wantlistCount = 0 }: BinderTabsProps) {
  return (
    <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900 p-1">
      <button
        type="button"
        onClick={() => onChange('collection')}
        aria-pressed={active === 'collection'}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'collection'
            ? 'bg-binder-accent text-white shadow'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <CardsIcon className="h-4 w-4" />
        En Venta / Colección
      </button>
      <button
        type="button"
        onClick={() => onChange('wantlist')}
        aria-pressed={active === 'wantlist'}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          active === 'wantlist'
            ? 'bg-fuchsia-500 text-white shadow'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
      >
        <SparklesIcon className="h-4 w-4" />
        Cartas Buscadas
        {wantlistCount > 0 && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              active === 'wantlist' ? 'bg-white/20 text-white' : 'bg-fuchsia-500/20 text-fuchsia-300'
            }`}
          >
            {wantlistCount}
          </span>
        )}
      </button>
    </div>
  )
}
