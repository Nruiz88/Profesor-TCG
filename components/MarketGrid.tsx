'use client'

import Link from 'next/link'
import type { ExploreBinder, ExploreCard } from '@/app/api/public/explore/route'
import { formatLocation, whatsAppLink } from '@/lib/profile'

function claimHref(card: ExploreCard): string {
  const seller = `@${card.username}`
  const text = encodeURIComponent(
    `Hola ${seller}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en Profesor TCG. ¿Sigue disponible? Quiero hacer un claim.`
  )
  return `${whatsAppLink(card.whatsapp_number ?? '')}?text=${text}`
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
      <p className="py-20 text-center text-sm text-slate-500">Buscando cartas de la comunidad…</p>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-white">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-500">
          No hay cartas en venta o intercambio que coincidan con esos filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-colors hover:border-slate-700"
        >
          {/* Imagen con badge flotante */}
          <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.card_name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {card.status === 'for_sale' && card.price != null ? (
              <span className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-yellow-400 shadow-md ring-1 ring-yellow-400/30">
                ${card.price.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            ) : (
              <span className="absolute right-2 top-2 rounded-full bg-sky-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                Trade
              </span>
            )}
          </div>

          {/* Datos */}
          <div className="flex flex-1 flex-col gap-1 p-3">
            <h3 className="truncate text-sm font-semibold text-white" title={card.card_name}>
              {card.card_name}
            </h3>
            <p className="truncate text-xs text-slate-500">
              {card.set_name}
              {card.rarity ? ` · ${card.rarity}` : ''}
            </p>

            {/* Vendedor */}
            <p className="mt-1 truncate text-xs text-slate-400">
              <span className="font-medium text-slate-300">@{card.username}</span>
              {formatLocation(card.city, card.country) &&
                ` · ${formatLocation(card.city, card.country)}`}
            </p>

            {/* Acciones */}
            <div className="mt-2 flex flex-col gap-1.5">
              <Link
                href={`/binder/${encodeURIComponent(card.username)}?card=${card.id}`}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-center text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
              >
                Ver en Binder 3D
              </Link>
              <a
                href={claimHref(card)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Claim WhatsApp
              </a>
            </div>
          </div>
        </div>
      ))}
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
      <p className="py-20 text-center text-sm text-slate-500">Buscando binders destacados…</p>
    )
  }

  if (binders.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
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
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-colors hover:border-slate-700"
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
                className="h-full w-full object-cover object-top"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
            <div className="absolute bottom-2 left-3 right-3">
              <p className="truncate text-sm font-bold text-white">{b.title}</p>
              <p className="text-xs text-slate-300">
                @{b.username} · {formatLocation(b.city, b.country) || 'Ubicación desconocida'}
              </p>
            </div>
          </Link>

          {/* Stats + acción */}
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="flex gap-2 text-center">
              <div className="rounded-lg bg-emerald-600/15 px-2 py-1">
                <p className="text-sm font-bold text-emerald-400">{b.saleCount}</p>
                <p className="text-[10px] uppercase tracking-wide text-emerald-500/70">Venta</p>
              </div>
              <div className="rounded-lg bg-sky-600/15 px-2 py-1">
                <p className="text-sm font-bold text-sky-400">{b.tradeCount}</p>
                <p className="text-[10px] uppercase tracking-wide text-sky-500/70">Cambio</p>
              </div>
            </div>
            <a
              href={`${whatsAppLink(b.whatsapp_number ?? '')}?text=${encodeURIComponent(
                `Hola @${b.username}! Vi tu binder "${b.title}" en Profesor TCG. ¿Tenés disponible alguna de tus cartas en venta o intercambio?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              WhatsApp
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
