'use client'

import './HomeV2Tabs.css'

export type TabId = 'market' | 'wantlist'

interface HomeV2TabsProps {
  tab: TabId
  onTabChange: (tab: TabId) => void
  /** Conteo de resultados de la solapa activa (se muestra como badge). */
  count: number
  /** Si hay más resultados paginables, se muestra "+". */
  hasMore: boolean
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'market', label: 'Mercado', icon: '🛍️' },
  { id: 'wantlist', label: 'Buscados', icon: '🔍' }
]

/** Switch deslizante Mercado ⇄ Buscados de la Home V2. */
export default function HomeV2Tabs({ tab, onTabChange, count, hasMore }: HomeV2TabsProps) {
  const isMarket = tab === 'market'

  return (
    <div className="v2t-switch">
      <span
        aria-hidden="true"
        className={`v2t-thumb ${isMarket ? 'v2t-thumb--market' : 'v2t-thumb--wantlist'}`}
      />
      {TABS.map((t) => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTabChange(t.id)}
            aria-pressed={active}
            className={`v2t-btn ${active ? 'v2t-btn--active' : 'v2t-btn--idle'}`}
          >
            <span>{t.icon}</span>
            {t.label}
            <span
              className={`v2t-badge ${active ? 'v2t-badge--active' : 'v2t-badge--idle'}`}
            >
              {count}
              {hasMore ? '+' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}