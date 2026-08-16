import type { SlotCard } from '@/lib/sheets'
import PokemonCard from './PokemonCard'

interface BinderSheetProps {
  sheetNumber: number
  slots: (SlotCard | null)[]
  onRemoveSlot?: (slotId: string) => void
  onEmptySlotClick?: (slotIndex: number) => void
}

export default function BinderSheet({ sheetNumber, slots, onRemoveSlot, onEmptySlotClick }: BinderSheetProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Hoja {sheetNumber}</h3>
        <span className="text-xs font-medium text-slate-600">{slots.filter(Boolean).length}/9</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {slots.map((card, i) => (
          <div
            key={i}
            className="group relative aspect-[63/88] rounded-xl"
          >
            {card ? (
              <div className="relative h-full w-full">
                <PokemonCard card={card} />

                {card.market_price != null && card.market_price > 0 && (
                  <div className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30">
                    ${card.market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}

                {onRemoveSlot && (
                  <button
                    onClick={() => onRemoveSlot(card.id)}
                    className="absolute left-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    aria-label={`Quitar ${card.card_name}`}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ) : onEmptySlotClick ? (
              <button
                type="button"
                onClick={() => onEmptySlotClick(i)}
                className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-800/30 transition-colors hover:border-slate-600 hover:bg-slate-800/50"
                aria-label={`Agregar carta al bolsillo ${i + 1}`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-700" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 14v4M10 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-xl border border-slate-800/70 bg-slate-800/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-700/60" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}