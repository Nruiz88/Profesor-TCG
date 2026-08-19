'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import LanguageBadge from '@/components/LanguageBadge'
import { formatPrice } from '@/lib/priceGuide'
import { formatCondition } from '@/lib/cardCondition'
import { slugify } from '@/lib/utils'
import PokemonCard from '@/components/PokemonCard'
import SellerInfoBadge, { type SellerInfo } from '@/components/SellerInfoBadge'
import ClaimModal from '@/components/ClaimModal'
import type { SlotCard } from '@/lib/sheets'
import { ArrowRightIcon, LockIcon, GlobeIcon } from '@/components/icons'

interface PublicCard {
  id: string
  card_id: string
  card_name: string
  set_id: string
  set_name: string
  number: string
  rarity: string | null
  variant: string | null
  supertype: string | null
  subtypes: string[] | null
  types: string[] | null
  status: string
  condition: string | null
  language: string | null
  manual_price: number | null
  currency: string
  is_user_reported: boolean
  is_for_sale: boolean
  is_for_trade: boolean
  trade_notes: string | null
  reserved_until: string | null
  price: number | null
  image: string
}

interface PublicCardResponse {
  card: PublicCard
  binder: { id: string; title: string; is_public: boolean }
  owner: SellerInfo | null
}

export default function PublicCardPage({ cardId }: { cardId: string }) {
  const [data, setData] = useState<PublicCardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showClaim, setShowClaim] = useState(false)
  const [claimApplied, setClaimApplied] = useState(false)

  // Al volver de /login tras un claim anónimo (?claim=…), la reserva ya se
  // aplicó en el login: mostramos la confirmación. NO limpiamos el flag de la
  // URL — el ClaimModal lo consume al montarse (lo quita y muestra su propio
  // éxito) para que la confirmación llegue también por la ruta del binder.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('claim_applied') === '1') setClaimApplied(true)
  }, [])

  useEffect(() => {
    if (!cardId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/public/cards/${cardId}`)
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Carta no encontrada')
        setData(body)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Carta no encontrada')
      } finally {
        setLoading(false)
      }
    })()
  }, [cardId])

  // Título SEO-friendly una vez cargada la carta
  useEffect(() => {
    if (data?.card.card_name) {
      document.title = `${data.card.card_name} · Profesor TCG`
    }
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen text-slate-200">
        <p className="py-24 text-center text-slate-500">Cargando carta…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen text-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-14 text-center">
            <h1 className="text-xl font-bold text-white">Profesor TCG</h1>
            <p className="mt-2 text-sm text-slate-400">{error || 'Carta no encontrada'}</p>
            <Link
              href="/explore"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-binder-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              Explorar el marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { card, binder, owner } = data
  const isReserved = card.status === 'reserved' && card.reserved_until != null
  const cardForModal: SlotCard = {
    id: card.id,
    binder_id: binder.id,
    card_id: card.card_id,
    card_name: card.card_name,
    set_id: card.set_id,
    number: card.number,
    slot_number: 1,
    market_price: null,
    status: card.status,
    is_for_sale: card.is_for_sale,
    is_for_trade: card.is_for_trade,
    price: card.price,
    trade_notes: card.trade_notes,
    condition: card.condition,
    language: card.language,
    manual_price: card.manual_price,
    currency: card.currency,
    is_user_reported: card.is_user_reported,
    reserved_until: card.reserved_until,
    rarity: card.rarity,
    variant: card.variant ?? 'normal',
    supertype: card.supertype,
    subtypes: card.subtypes,
    types: card.types,
    image: card.image
  }

  return (
    <div className="min-h-screen text-slate-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Barra de navegación + badges */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/explore"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Volver al marketplace
          </Link>
          {binder.is_public ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              <GlobeIcon width={13} height={13} /> Binder público
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-[11px] font-semibold text-slate-400">
              <LockIcon width={13} height={13} /> Publicación individual (binder privado)
            </span>
          )}
        </div>

        <div className="grid items-start gap-10 md:grid-cols-2">
          {/* Carta 3D */}
          <div className="mx-auto w-full max-w-xs md:max-w-sm">
            <div className="relative">
              {/* Glow de fondo */}
              <div className="pointer-events-none absolute -inset-8 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div className="relative">
                <PokemonCard card={cardForModal} />
              </div>
            </div>

            {card.rarity && (
              <p className="mt-4 text-center text-xs text-slate-500">
                {card.set_name} · {card.rarity}
              </p>
            )}
          </div>

          {/* Info + acciones */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-white">{card.card_name}</h1>
              <LanguageBadge language={card.language} />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {card.set_id.toUpperCase()} · #{card.number}
              {card.condition && <span className="ml-2 text-slate-500">· {formatCondition(card.condition)}</span>}
            </p>

            {/* Precio */}
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-emerald-500/25 bg-slate-900 p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
              <p className="text-[10px] uppercase tracking-widest text-emerald-500/60">Precio</p>
              <p className="text-3xl font-bold text-emerald-400">
                {card.price != null ? formatPrice(card.price, card.currency) : 'Consultar'}
                {card.is_user_reported && (
                  <span className="ml-2 text-xs font-semibold text-emerald-400/60">★ manual</span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {card.is_for_sale && card.is_for_trade
                  ? 'En venta y acepta intercambios'
                  : card.is_for_sale
                    ? 'En venta'
                    : 'Acepta intercambios'}
              </p>
            </div>

            {card.trade_notes && (
              <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                <span className="font-semibold">🔄 Busca a cambio:</span> {card.trade_notes}
              </div>
            )}

            {claimApplied && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                ✅ <strong>¡Reserva aplicada!</strong> {card.card_name} quedó reservada para vos
                por 24&nbsp;h. Coordiná con el vendedor por WhatsApp; al confirmar la compra,
                ambas partes pueden calificarse.
              </div>
            )}
            {isReserved && !claimApplied && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                ⏳ Esta carta está <strong>reservada</strong> por un claim activo (24h).
              </div>
            )}

            {/* Acciones */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => setShowClaim(true)}
                className="rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500"
              >
                ⚡ Hacer Claim / Reclamar
              </button>

              {binder.is_public && owner && (
                <Link
                  href={`/binder/${encodeURIComponent(owner.username ?? 'coleccionista')}?card=${card.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                >
                  Ver el binder completo de @{owner.username}
                  <ArrowRightIcon width={15} height={15} />
                </Link>
              )}
            </div>

            {owner && (
              <div className="mt-8">
                <SellerInfoBadge seller={owner} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showClaim && (
        <ClaimModal card={cardForModal} seller={owner} onClose={() => setShowClaim(false)} />
      )}
    </div>
  )
}
