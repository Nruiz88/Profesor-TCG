import type { ExploreCard } from '@/app/api/public/explore/route'

interface ShowroomCardsProps {
  cards: ExploreCard[]
}

/**
 * Carta placeholder gris (slot vacío) para cuando no hay cartas destacadas.
 */
function EmptyCardSlot({ index }: { index: number }) {
  return (
    <div
      className="absolute w-24"
      style={{
        transform: `translateX(${(index - 1.5) * 22}px) rotate(${(index - 1.5) * 6}deg)`,
        zIndex: 10 + index
      }}
    >
      <div className="aspect-[2.5/3.5] overflow-hidden rounded-xl border-2 border-dashed border-slate-700/50 bg-slate-800/30">
        <div className="flex h-full flex-col items-center justify-center gap-1 p-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-600" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span className="text-[8px] font-semibold uppercase tracking-wider text-slate-600">
            Slot {index + 1}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Card "— MIS CARTAS DESTACADAS": muestra hasta 4 cartas destacadas del
 * usuario en un abanico visual. Si no hay cartas destacadas, muestra 4
 * slots grises como placeholder para que se entienda la función.
 */
export default function ShowroomCards({ cards }: ShowroomCardsProps) {
  const featured = cards.slice(0, 4)
  const hasCards = featured.length > 0

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ffcc]/80">
        — Mis Cartas Destacadas
      </p>

      {/* Escenario del abanico */}
      <div className="relative mt-4 h-48 rounded-2xl border border-slate-800/60 bg-slate-950/60">
        {/* Piso / mesa */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t from-black/40 to-transparent" />

        {/* Slots grises cuando no hay cartas */}
        {!hasCards && (
          <div className="absolute inset-0 flex items-center justify-center">
            {[0, 1, 2, 3].map((i) => (
              <EmptyCardSlot key={i} index={i} />
            ))}
          </div>
        )}

        {/* Cartas reales destacadas */}
        {hasCards && (
          <div className="absolute inset-0 flex items-center justify-center">
            {featured.map((card, i) => {
              const offset = (i - (featured.length - 1) / 2) * 22
              const rotate = (i - (featured.length - 1) / 2) * 6
              return (
                <div
                  key={card.id}
                  className="absolute w-24 transition-transform duration-300 hover:z-20 hover:-translate-y-2"
                  style={{
                    transform: `translateX(${offset}px) rotate(${rotate}deg)`,
                    zIndex: 10 + i
                  }}
                >
                  <div className="overflow-hidden rounded-xl border border-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
                    {card.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={card.image}
                        alt={card.card_name}
                        className="aspect-[2.5/3.5] w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-[2.5/3.5] w-full items-center justify-center bg-slate-800 text-2xl text-slate-600">
                        🃏
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pie */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {featured.length} de 4 destacada{featured.length !== 1 ? 's' : ''}
        </span>
        {!hasCards && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#00ffcc]/70">
            Click ⭐ en tu binder
          </span>
        )}
        {hasCards && featured.length >= 4 && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#00ffcc]/70">
            Showroom activo
          </span>
        )}
        {hasCards && featured.length < 4 && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#00ffcc]/70">
            {4 - featured.length} slot{4 - featured.length !== 1 ? 's' : ''} disponible{4 - featured.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}