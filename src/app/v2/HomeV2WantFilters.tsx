'use client'

import SelectField from './SelectField'
import type { WantlistFacets } from '@/app/api/public/wantlist/route'
import './HomeV2WantFilters.css'

const WANT_SORTS = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'name', label: 'Nombre: A-Z' },
  { id: 'budget_desc', label: 'Presupuesto: mayor a menor' }
]

export interface HomeV2WantFiltersProps {
  wantFacets: WantlistFacets
  wantRarity: string
  onWantRarityChange: (v: string) => void
  wantSet: string
  onWantSetChange: (v: string) => void
  wantSort: string
  onWantSortChange: (v: string) => void
}

/** Filtros de la solapa Buscados (wishlist) de la Home V2. */
export default function HomeV2WantFilters({
  wantFacets,
  wantRarity,
  onWantRarityChange,
  wantSet,
  onWantSetChange,
  wantSort,
  onWantSortChange
}: HomeV2WantFiltersProps) {
  return (
    <>
      {/* Ordenar */}
      <label className="v2wf-field">
        <span className="v2wf-label">Ordenar</span>
        <SelectField value={wantSort} onChange={onWantSortChange} label="Ordenar">
          {WANT_SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </SelectField>
      </label>

      {/* Variante (rareza) */}
      <label className="v2wf-field">
        <span className="v2wf-label">Variante</span>
        <SelectField value={wantRarity} onChange={onWantRarityChange} label="Filtrar por variante">
          <option value="">Todas las variantes</option>
          {wantFacets.rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </SelectField>
      </label>

      {/* Set */}
      <label className="v2wf-field">
        <span className="v2wf-label">Set</span>
        <SelectField value={wantSet} onChange={onWantSetChange} label="Filtrar por set">
          <option value="">Todos los sets</option>
          {wantFacets.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
      </label>
    </>
  )
}