import type { ExploreCard } from '@/app/api/public/explore/route'

interface ShowroomCardsProps {
  cards: ExploreCard[]
}

/**
 * Card "— MIS CARTAS DESTACADAS": abanico de hasta 3 cartas superpuestas.
 * Si hay menos de 3 destacadas, se muestra un overlay oscuro explicativo
 * (requisito: mínimo 3 cartas para activar el showroom).
 */
export default function ShowroomCards({ cards }: ShowroomCardsProps) {
  const featured = cards.slice(0, 3)
  const hasThree = featured.length >= 3

  return (
    <div className="flex h-full flex-col rounded-3xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#00ffcc]/80">
        — Mis Cartas Destacadas
      </p>

      {/* Escenario del abanico */}
      <div className="relative mt-4 h-44 rounded-2xl border border-slate-800/60 bg-slate-950/60">
        {/* Piso / mesa */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 rounded-b-2xl bg-gradient-to-t from-black/40 to-transparent" />

        {featured.length > 0 && (
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

        {/* Overlay de estado vacío: menos de 3 destacadas */}
        {!hasThree && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-slate-950/85 p-5 text-center backdrop-blur-sm">
            <span className="text-2xl">🃏</span>
            <p className="max-w-[16rem] text-xs leading-relaxed text-slate-400">
              Va a tu inventario, haz clic en una carta y presiona{' '}
              <span className="font-bold text-[#00ffcc]">Destacar</span> — mínimo 3 cartas
            </p>
          </div>
        )}
      </div>

      {/* Pie */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {featured.length} carta{featured.length !== 1 ? 's' : ''}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#00ffcc]/70">
          {hasThree ? 'Showroom activo' : 'Incompleto'}
        </span>
      </div>
    </div>
  )
}