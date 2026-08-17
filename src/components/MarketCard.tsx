'use client'

import { useRef } from 'react'
import Link from 'next/link'
import type { ExploreCard } from '@/app/api/public/explore/route'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'
import { formatPrice } from '@/lib/priceGuide'
import { slugify } from '@/lib/utils'
import { ArrowRightIcon, ChatIcon } from '@/components/icons'

// Mensaje pre-armado del claim (mismo formato que MarketGrid/ClaimModal)
function claimHref(card: ExploreCard): string {
  const text = encodeURIComponent(
    `Hola @${card.username}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en Profesor TCG. ¿Sigue disponible? Quiero hacer un claim.`
  )
  return `${whatsAppLink(card.whatsapp_number ?? '')}?text=${text}`
}

// Brillo del marco según la rareza de la carta
function rarityGlow(rarity: string | null): string {
  const r = (rarity ?? '').toLowerCase()
  if (/special illustration|secret|hyper|rainbow/.test(r)) return 'rgba(244, 63, 94, 0.4)'
  if (/illustration|ultra|vmax|vstar|gold/.test(r)) return 'rgba(251, 191, 36, 0.35)'
  if (/double rare|rare holo|radiant/.test(r)) return 'rgba(56, 189, 248, 0.3)'
  if (/rare|ex\b/.test(r)) return 'rgba(167, 139, 250, 0.25)'
  return 'rgba(148, 163, 184, 0.15)'
}

// ¿La carta cuenta como "rara" para el filtro 🔥?
export function isRareCard(card: ExploreCard): boolean {
  return /illustration|secret|hyper|gold|shiny|ultra|vmax|vstar|radiant|double rare|rare holo|ex\b/i.test(
    card.rarity ?? ''
  )
}

/**
 * Tarjeta del marketplace con efecto tilt 3D + brillo especular que sigue el
 * cursor. Puro CSS 3D y pointer events (sin dependencias): el transform y el
 * glare se escriben directo al DOM vía refs para no re-renderizar por frame.
 */
export default function MarketCard({ card }: { card: ExploreCard }) {
  const tiltRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (0.5 - py) * 10
    const ry = (px - 0.5) * 12
    el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,0.28), transparent 55%)`
      glareRef.current.style.opacity = '1'
    }
  }

  const onLeave = () => {
    const el = tiltRef.current
    if (el) el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'
    if (glareRef.current) glareRef.current.style.opacity = '0'
  }

  const glow = rarityGlow(card.rarity)
  const hasWhatsApp = !!card.whatsapp_number
  const location = formatLocation(card.city, card.country)
  const isSale = card.status === 'for_sale' && card.price != null

  return (
    <div
      ref={tiltRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group relative transition-transform duration-200 ease-out will-change-transform"
      style={{ transitionProperty: 'transform, opacity' }}
    >
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.45)] transition-shadow duration-300 group-hover:border-slate-600">
        {/* Imagen con marco + brillo de rareza */}
        <div
          className="relative aspect-[63/88] overflow-hidden bg-slate-950"
          style={{
            boxShadow: `inset 0 0 0 1px ${glow}, 0 12px 34px -12px ${glow}`
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image}
            alt={card.card_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />

          {/* Brillo especular que sigue el cursor */}
          <div
            ref={glareRef}
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200"
          />

          {/* Badge de wantlist (la carta la busca el visitante) */}
          {card.onWantlist && (
            <span
              title="Esta carta está en tu wantlist"
              className="absolute right-2 top-2 rounded-full border border-white/20 bg-fuchsia-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-md"
            >
              🔔 Wantlist
            </span>
          )}

          {/* Badge superior glassmorphism */}
          <div className="absolute left-2 top-2">
            {isSale ? (
              <span
                title={
                  card.is_user_reported
                    ? 'Precio reportado por el usuario'
                    : 'Precio de mercado'
                }
                className="flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md shadow-lg"
              >
                💵 {formatPrice(card.price!, card.currency)}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-300 backdrop-blur-md shadow-lg">
                🔄 Solo Trade
              </span>
            )}
          </div>

          {/* Overlay de acciones al hover (siempre visible en touch) */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-coarse:opacity-100">
            {hasWhatsApp && (
              <a
                href={claimHref(card)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-400"
              >
                <ChatIcon width={14} height={14} />
                Hacer Claim
              </a>
            )}
            <Link
              href={
                card.binder_public
                  ? `/binder/${encodeURIComponent(card.username)}?card=${card.id}`
                  : `/card/${card.id}/${slugify(card.card_name)}`
              }
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              {card.binder_public ? 'Ver en Binder 3D' : 'Ver carta 3D'}
              <ArrowRightIcon width={13} height={13} />
            </Link>
          </div>
        </div>

        {/* Set y rareza */}
        <div className="px-3 pt-2.5">
          <p className="truncate text-[11px] font-medium text-slate-500">
            {card.set_name}
            {card.rarity ? ` · ${card.rarity}` : ''}
            {card.language
              ? ` · ${CARD_LANGUAGE_META[normalizeLanguage(card.language)].flag} ${card.language}`
              : ''}
          </p>
        </div>

        {/* Footer: vendedor + estado */}
        <div className="flex items-center gap-2.5 p-3 pt-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-xs font-bold text-white shadow-md">
            {(card.username[0] ?? 'C').toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white" title={card.card_name}>
              {card.card_name}
            </p>
            <p className="truncate text-xs text-slate-500">
              <Link
                href={`/profile/${encodeURIComponent(card.username)}`}
                className="font-semibold text-slate-300 transition-colors hover:text-rose-300"
                title="Ver perfil público"
              >
                @{card.username}
              </Link>
              {card.ratingAvg != null && (
                <span className="ml-1 font-bold text-yellow-400">★ {card.ratingAvg.toFixed(1)}</span>
              )}
              {card.reviewCount > 0 && (
                <span className="text-slate-600"> ({card.reviewCount})</span>
              )}
              {card.isVerified && (
                <span className="ml-0.5 text-emerald-400" title="Verificado">⚡</span>
              )}
              {location && ` · ${location}`}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isSale
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-sky-500/15 text-sky-400'
            }`}
          >
            {isSale ? 'En venta' : 'Acepta cambios'}
          </span>
        </div>
      </div>
    </div>
  )
}
