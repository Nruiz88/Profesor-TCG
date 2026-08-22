'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, SearchIcon, XIcon } from '@/components/icons'
import type { ExploreFacets } from '@/app/api/public/explore/route'
import type { WantlistFacets } from '@/app/api/public/wantlist/route'
import { CARD_LANGUAGES, CARD_LANGUAGE_META } from '@/lib/cardLanguage'
import SelectField from './SelectField'
import HomeV2WantFilters from './HomeV2WantFilters'
import './HomeV2Filters.css'

export type FilterTab = 'market' | 'wantlist'
export type FilterMode = 'all' | 'for_sale' | 'for_trade'

const MODES: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'for_sale', label: 'En venta' },
  { id: 'for_trade', label: 'Para cambio' }
]

const SORTS = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'price_asc', label: 'Precio: menor a mayor' },
  { id: 'price_desc', label: 'Precio: mayor a menor' }
]

const PLACEHOLDERS: Record<FilterTab, string> = {
  market: 'Buscar en el mercado (ej: Pikachu, Charizard…)',
  wantlist: 'Buscar cartas que la comunidad está buscando…'
}

export interface HomeV2FiltersProps {
  tab: FilterTab
  search: string
  onSearchChange: (v: string) => void
  facets: ExploreFacets
  wantFacets: WantlistFacets
  mode: FilterMode
  onModeChange: (v: FilterMode) => void
  marketSet: string
  onMarketSetChange: (v: string) => void
  marketRarity: string
  onMarketRarityChange: (v: string) => void
  marketVariant: string
  onMarketVariantChange: (v: string) => void
  marketLang: string
  onMarketLangChange: (v: string) => void
  sort: string
  onSortChange: (v: string) => void
  wantRarity: string
  onWantRarityChange: (v: string) => void
  wantSet: string
  onWantSetChange: (v: string) => void
  wantSort: string
  onWantSortChange: (v: string) => void
  hasActiveFilters: boolean
  onClear: () => void
}

/** Panel de filtros de la Home V2 (buscador + filtros del market/buscados). */
export default function HomeV2Filters({
  tab,
  search,
  onSearchChange,
  facets,
  wantFacets,
  mode,
  onModeChange,
  marketSet,
  onMarketSetChange,
  marketRarity,
  onMarketRarityChange,
  marketVariant,
  onMarketVariantChange,
  marketLang,
  onMarketLangChange,
  sort,
  onSortChange,
  wantRarity,
  onWantRarityChange,
  wantSet,
  onWantSetChange,
  wantSort,
  onWantSortChange,
  hasActiveFilters,
  onClear
}: HomeV2FiltersProps) {
  const isMarket = tab === 'market'

  // Cantidad de filtros activos (sin contar el texto del buscador) para el
  // badge del acordeón en mobile.
  const activeCount = isMarket
    ? (mode !== 'all' ? 1 : 0) +
      (marketSet ? 1 : 0) +
      (marketRarity ? 1 : 0) +
      (marketVariant ? 1 : 0) +
      (marketLang ? 1 : 0) +
      (sort !== 'recent' ? 1 : 0)
    : (wantRarity ? 1 : 0) + (wantSet ? 1 : 0) + (wantSort !== 'recent' ? 1 : 0)

  // En mobile el panel de filtros está plegado por defecto; el buscador y el
  // botón "Filtros (n)" quedan siempre visibles.
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <aside className="v2f-aside">
      <div className="v2f-panel">
        {/* Buscador (busca según la solapa activa) */}
        <div className="v2f-search">
          <SearchIcon
            className={`v2f-search-icon ${
              isMarket ? 'v2f-search-icon--market' : 'v2f-search-icon--wantlist'
            }`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={PLACEHOLDERS[tab]}
            aria-label="Buscar"
            className={`v2f-search-input ${
              isMarket ? 'v2f-search-input--market' : 'v2f-search-input--wantlist'
            }`}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="v2f-search-clear"
              aria-label="Limpiar búsqueda"
            >
              <XIcon width={13} height={13} />
            </button>
          )}
        </div>

        {/* Acordeón de filtros (solo mobile) */}
        <div className="v2f-toggle-row">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="v2f-fields"
            className="v2f-toggle"
          >
            <span className="v2f-toggle-label">Filtros</span>
            {activeCount > 0 && <span className="v2f-toggle-badge">{activeCount}</span>}
            <span className="v2f-toggle-chevron">
              {mobileOpen ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
            </span>
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={onClear} className="v2f-head-clear">
              <XIcon width={11} height={11} />
              Limpiar
            </button>
          )}
        </div>

        {/* Campos de filtro: plegados en mobile, siempre visibles en desktop */}
        <div id="v2f-fields" className={`${mobileOpen ? '' : 'hidden'} lg:block`}>
        <div className="v2f-head">
          <h2
            className={`v2f-head-title ${
              isMarket ? 'v2f-head-title--market' : 'v2f-head-title--wantlist'
            }`}
          >
            Filtros
          </h2>
          {hasActiveFilters && (
            <button onClick={onClear} className="v2f-head-clear">
              <XIcon width={11} height={11} />
              Limpiar
            </button>
          )}
        </div>

        {isMarket ? (
          <>
            {/* Disponibilidad */}
            <label className="v2f-field">
              <span className="v2f-field-label">Disponibilidad</span>
              <div className="v2f-mode">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onModeChange(m.id)}
                    aria-pressed={mode === m.id}
                    className={`v2f-mode-btn ${
                      mode === m.id ? 'v2f-mode-btn--active' : 'v2f-mode-btn--idle'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </label>

            {/* Ordenar */}
            <label className="v2f-field">
              <span className="v2f-field-label">Ordenar</span>
              <SelectField value={sort} onChange={onSortChange} label="Ordenar">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </SelectField>
            </label>

            {/* Variante (rareza) */}
            <label className="v2f-field">
              <span className="v2f-field-label">Variante</span>
              <SelectField value={marketRarity} onChange={onMarketRarityChange} label="Filtrar por variante">
                <option value="">Todas las variantes</option>
                {facets.rarities.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectField>
            </label>

            {/* Versión */}
            <label className="v2f-field">
              <span className="v2f-field-label">Versión</span>
              <SelectField value={marketVariant} onChange={onMarketVariantChange} label="Filtrar por versión">
                <option value="">Todas las versiones</option>
                {facets.variants.map((v) => (
                  <option key={v} value={v}>
                    {{
                      normal: '🃏 Normal',
                      holo: '✨ Holo',
                      reverse_holo: '🔄 Reverse Holo',
                      v: '⚡ Pokémon V',
                      v_full_art: '🖼️ V Full Art',
                      v_alternate_art: '🎨 V Alt Art',
                      vmax: '💥 VMAX',
                      vmax_alternate: '🌈 VMAX Alt',
                      vstar: '⭐ VSTAR',
                      trainer_full_art: '🧑‍🏫 Trainer FA',
                      rainbow_rare: '🌈 Rainbow Rare',
                      secret_rare_gold: '🥇 Gold SR'
                    }[v] ?? v}
                  </option>
                ))}
              </SelectField>
            </label>

            {/* Set */}
            <label className="v2f-field">
              <span className="v2f-field-label">Set</span>
              <SelectField value={marketSet} onChange={onMarketSetChange} label="Filtrar por set">
                <option value="">Todos los sets</option>
                {facets.sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            </label>

            {/* Idioma */}
            <label className="v2f-field">
              <span className="v2f-field-label">Idioma</span>
              <SelectField value={marketLang} onChange={onMarketLangChange} label="Filtrar por idioma">
                <option value="">Todos los idiomas</option>
                {CARD_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {CARD_LANGUAGE_META[lang].flag} {CARD_LANGUAGE_META[lang].label}
                  </option>
                ))}
              </SelectField>
            </label>
          </>
        ) : (
          <HomeV2WantFilters
            wantFacets={wantFacets}
            wantRarity={wantRarity}
            onWantRarityChange={onWantRarityChange}
            wantSet={wantSet}
            onWantSetChange={onWantSetChange}
            wantSort={wantSort}
            onWantSortChange={onWantSortChange}
          />
        )}
        </div>
      </div>
    </aside>
  )
}