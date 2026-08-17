'use client'

import type { SearchResult } from '@/types'

interface SearchResultCardProps {
  card: SearchResult
  /** Esta carta se está guardando (muestra busyLabel) */
  busy?: boolean
  /** Deshabilita todas las tarjetas mientras hay una guardándose */
  disabled?: boolean
  actionLabel?: string
  busyLabel?: string
  onSelect: (card: SearchResult) => void
}

// Celda de resultado del catálogo: imagen full-card con degradado de nombre
// abajo y badge de acción al hover. Es la misma tarjeta que usa el modal de
// bolsillo, reutilizada por el buscador del binder para que el resultado se
// vea idéntico en ambos flujos.
export default function SearchResultCard({
  card,
  busy = false,
  disabled = false,
  actionLabel = 'Seleccionar',
  busyLabel = 'Guardando…',
  onSelect
}: SearchResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      disabled={disabled}
      className="group relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-left transition-colors hover:border-slate-600"
      aria-label={`Agregar ${card.name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image}
        alt={card.name}
        loading="lazy"
        className="aspect-[63/88] w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1 pt-6">
        <p className="truncate text-[10px] font-semibold text-white">{card.name}</p>
        <p className="truncate text-[9px] text-slate-300">
          {card.set_name} · {card.number}
        </p>
      </div>
      <span className="absolute right-1 top-1 rounded-full bg-binder-accent px-2 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
        {busy ? busyLabel : actionLabel}
      </span>
    </button>
  )
}
