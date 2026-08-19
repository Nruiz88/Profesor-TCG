'use client'

import Link from 'next/link'
import type { ExploreBinder, ExploreCard } from '@/app/api/public/explore/route'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { slugify } from '@/lib/utils'
import { AlertIcon, ArrowRightIcon } from '@/components/icons'

// Mensaje pre-armado del claim (mismo formato que el resto de la app)
function claimHref(card: ExploreCard): string {
  const seller = `@${card.username}`
  const text = encodeURIComponent(
    `Hola ${seller}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en Profesor TCG. ¿Sigue disponible? Quiero hacer un claim.`
  )
  return `${whatsAppLink(card.whatsapp_number ?? '')}?text=${text}`
}

// Deep link: siempre a la vista individual /card/[id]/[slug]
function binderHref(card: ExploreCard): string {
  return `/card/${card.id}/${slugify(card.card_name)}`
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5">
      <div className="shimmer aspect-[63/88] rounded-xl" />
      <div className="mt-3 space-y-2">
        <div className="shimmer h-3.5 w-3/4 rounded" />
        <div className="shimmer h-3 w-1/2 rounded" />
      </div>
    </div>
  )
}

export default function MarketGrid({
  cards,
  loading
}: {
  cards: ExploreCard[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800/80 bg-slate-900/40 px-6 py-20 text-center backdrop-blur-xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <AlertIcon className="h-7 w-7 text-amber-400" />
        </span>
        <p className="mt-4 text-sm font-bold uppercase tracking-widest text-white">
          No hay cartas en venta con esos filtros
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Probá ajustar o limpiar los filtros para ver más resultados.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => {
        const isSale = card.status === 'for_sale' && card.price != null
        const location = formatLocation(card.city, card.country)
        return (
          <div
            key={card.id}
            className={`group relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.65)] ${
              isSale
                ? 'hover:border-rose-500/40 hover:shadow-rose-900/20'
                : 'hover:border-blue-500/40 hover:shadow-blue-900/20'
            }`}
          >
            {/* Marco interno de la carta */}
            <div className="relative overflow-hidden rounded-xl bg-slate-950/60">
              <Link
                href={binderHref(card)}
                className="relative block aspect-[63/88]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.image}
                  alt={card.card_name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>

              {/* Badge flotante superior izquierda: la carta está en tu wantlist */}
              {card.onWantlist && (
                <span
                  className="absolute left-2.5 top-2.5 rounded-full bg-fuchsia-500 px-2 py-1 text-[10px] font-bold text-white shadow-lg shadow-fuchsia-950/50"
                  title="Esta carta está en tu wantlist"
                >
                  🔔 Wantlist
                </span>
              )}

              {/* Badge flotante superior derecha */}
              {isSale ? (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-emerald-950 shadow-lg shadow-emerald-950/50">
                  ${fmtUsd(card.price!)}
                </span>
              ) : (
                <span className="absolute right-2.5 top-2.5 rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-950/50">
                  🔄 Trade
                </span>
              )}
            </div>

            {/* Info de la carta */}
            <div className="mt-3">
              <h3
                className="truncate text-sm font-bold text-white"
                title={card.card_name}
              >
                {card.card_name}
              </h3>
              <p className="truncate text-[11px] text-slate-500">
                {card.set_name}
                {card.rarity ? ` · ${card.rarity}` : ''}
              </p>
            </div>

            {/* Footer del vendedor */}
            <div className="mt-3 flex flex-1 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-xs font-bold text-white shadow">
                {(card.username[0] ?? 'C').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-200">
                  <Link
                    href={`/profile/${encodeURIComponent(card.username)}`}
                    className="transition-colors hover:text-rose-300"
                    title="Ver perfil público"
                  >
                    @{card.username}
                  </Link>
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {location || 'Ubicación no especificada'}
                  {card.trainerRank && (
                    <span
                      className="ml-1 text-fuchsia-400"
                      title={`Rango de Entrenador: ${card.trainerRank.name}`}
                    >
                      {card.trainerRank.icon} {card.trainerRank.name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Acción directa */}
            <div className="mt-3">
              {card.whatsapp_number ? (
                <a
                  href={claimHref(card)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold shadow-lg transition-all duration-200 ${
                    isSale
                      ? 'bg-emerald-500 text-white shadow-emerald-950/40 hover:bg-emerald-400'
                      : 'border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500 hover:text-white'
                  }`}
                >
                  {isSale ? '💬 Claim' : '🔄 Swap'}
                </a>
              ) : (
                <span className="block rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-center text-[11px] text-slate-600">
                  Sin contacto directo ·{' '}
                  <Link href={binderHref(card)} className="text-slate-400 hover:text-white">
                    Ver carta
                  </Link>
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BindersGrid({
  binders,
  loading
}: {
  binders: ExploreBinder[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40"
          >
            <div className="shimmer aspect-[16/9]" />
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (binders.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 px-6 py-16 text-center backdrop-blur-xl">
        <p className="text-lg font-semibold text-white">Todavía no hay binders destacados</p>
        <p className="mt-1 text-sm text-slate-500">
          Cuando alguien publique cartas en venta o intercambio, aparecen acá.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {binders.map((b) => (
        <div
          key={b.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-[0_18px_44px_-12px_rgba(0,0,0,0.65)]"
        >
          {/* Portada */}
          <Link
            href={`/binder/${encodeURIComponent(b.username)}`}
            className="relative block aspect-[16/9] overflow-hidden bg-slate-950"
          >
            {b.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.coverImage}
                alt={`Portada de ${b.title}`}
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3">
              <p className="truncate text-sm font-bold text-white">{b.title}</p>
              <p className="truncate text-xs text-slate-300">
                @{b.username} · {formatLocation(b.city, b.country) || 'Ubicación desconocida'}
              </p>
            </div>
          </Link>

          {/* Stats + acción */}
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="flex gap-2 text-center">
              <div className="rounded-lg bg-emerald-500/10 px-2 py-1">
                <p className="text-sm font-bold text-emerald-400">{b.saleCount}</p>
                <p className="text-[10px] uppercase tracking-wide text-emerald-500/70">Venta</p>
              </div>
              <div className="rounded-lg bg-blue-500/10 px-2 py-1">
                <p className="text-sm font-bold text-blue-400">{b.tradeCount}</p>
                <p className="text-[10px] uppercase tracking-wide text-blue-500/70">Cambio</p>
              </div>
            </div>
            <a
              href={`${whatsAppLink(b.whatsapp_number ?? '')}?text=${encodeURIComponent(
                `Hola @${b.username}! Vi tu binder "${b.title}" en Profesor TCG. ¿Tenés disponible alguna de tus cartas en venta o intercambio?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-400"
            >
              WhatsApp
              <ArrowRightIcon width={12} height={12} />
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
