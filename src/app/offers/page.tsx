'use client'

import { useCallback, useEffect, useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import { formatCondition } from '@/lib/cardCondition'
import { formatPrice } from '@/lib/priceGuide'
import { ChatIcon, SwapIcon } from '@/components/icons'
import { formatLocation } from '@/lib/profile'
import {
  normalizeOfferStatus,
  tradeIsFavorable,
  tradeValueText,
  TRADE_OFFER_STATUS_META,
  type TradeOfferView,
  type OfferCardView
} from '@/lib/tradeOffers'
import type { SlotCard } from '@/lib/sheets'

type Inbox = 'received' | 'sent'

const fmt = (n: number | null | undefined) =>
  n != null
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`
  return `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) !== 1 ? 's' : ''}`
}

// Convierte una carta de oferta a SlotCard (para la animación holo)
function toSlotCard(o: OfferCardView, id: string): SlotCard {
  return {
    id,
    binder_id: '',
    card_id: `${o.set_id}-${o.number}`,
    card_name: o.card_name,
    set_id: o.set_id,
    number: o.number,
    slot_number: 1,
    rarity: o.rarity,
    supertype: o.supertype,
    subtypes: o.subtypes ?? [],
    types: o.types ?? [],
    variant: o.variant,
    image: o.image
  } as SlotCard
}

export default function OffersPage() {
  const [inbox, setInbox] = useState<Inbox>('received')
  const [offers, setOffers] = useState<TradeOfferView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const load = useCallback(async (which: Inbox) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/offers?inbox=${which}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar ofertas')
      setOffers(data.offers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(inbox)
  }, [inbox, load])

  async function updateStatus(offerId: string, status: 'accepted' | 'rejected' | 'cancelled') {
    setActingId(offerId)
    setError(null)
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await load(inbox)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setActingId(null)
    }
  }

  function confirmWhatsApp(offer: TradeOfferView): string {
    const sender = offer.sender
    return (
      `https://wa.me/${(sender.whatsapp_number ?? '').replace(/\D/g, '')}` +
      `?text=${encodeURIComponent(
        `Hola @${sender.username}! Acepté tu oferta por "${offer.requested.card_name}" en Profesor TCG. Coordinemos la entrega del intercambio.`
      )}`
    )
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/25 to-rose-500/25 text-xl ring-1 ring-fuchsia-400/30">
            <SwapIcon className="h-5 w-5 text-fuchsia-400" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Ofertas de intercambio</h1>
            <p className="text-sm text-slate-500">
              Propuestas de swap entre binders de la comunidad.
            </p>
          </div>
        </div>

        {/* Tabs Enviadas / Recibidas */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-1 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setInbox('received')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
              inbox === 'received'
                ? 'bg-fuchsia-500/15 text-fuchsia-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📥 Recibidas
          </button>
          <button
            type="button"
            onClick={() => setInbox('sent')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
              inbox === 'sent'
                ? 'bg-fuchsia-500/15 text-fuchsia-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📤 Enviadas
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-20 text-center text-slate-500">Cargando ofertas…</p>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-white">
              Sin ofertas {inbox === 'received' ? 'recibidas' : 'enviadas'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {inbox === 'received'
                ? 'Cuando alguien proponga un intercambio por una de tus cartas, aparece acá.'
                : 'Proponé un cambio desde la ficha pública de otro coleccionista y lo vas a ver acá.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => {
              const status = normalizeOfferStatus(o.status)
              const meta = TRADE_OFFER_STATUS_META[status]
              const other = inbox === 'received' ? o.sender : o.receiver
              const location = formatLocation(other.city, other.country)
              const favorable =
                status === 'pending' &&
                inbox === 'received' &&
                tradeIsFavorable(o.totalRequested, o.totalOffered)
              return (
                <div
                  key={o.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl"
                >
                  {/* Carta solicitada con animación holo */}
                  <div className="flex justify-center bg-gradient-to-b from-slate-950 to-slate-900/40 px-6 pt-6">
                    <div className="w-48">
                      <PokemonCard card={toSlotCard(o.requested, `req-${o.id}`)} />
                    </div>
                  </div>

                  {/* Precio bien notorio */}
                  <div className="px-5 pt-4 text-center">
                    <p className="text-3xl font-black tracking-tight text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                      {o.requested.price != null ? formatPrice(o.requested.price, o.requested.currency ?? 'USD') : 'Consultar precio'}
                    </p>
                  </div>

                  {/* Info de la carta */}
                  <div className="px-5 pt-3">
                    <h3 className="truncate text-center text-base font-bold text-white">
                      {o.requested.card_name}
                    </h3>
                    <p className="text-center text-xs text-slate-500">
                      {o.requested.set_id.toUpperCase()} · #{o.requested.number}
                    </p>
                  </div>

                  {/* Idioma + Condición + Estatus */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 px-5 pt-3">
                    {o.requested.language && (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        🌐 {o.requested.language}
                      </span>
                    )}
                    {o.requested.condition && (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                        {formatCondition(o.requested.condition)}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>

                  {/* Lo que ofrece */}
                  <div className="mx-5 mt-4 rounded-xl border border-emerald-500/20 bg-slate-950/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/80">
                      Ofrece{`${o.offered.length > 0 ? ` (${o.offered.length})` : ''}`} · {fmt(o.totalOffered)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.offered.map((c) => (
                        <div key={c.id} className="w-14">
                          {c.image && (
                            <div className="overflow-hidden rounded-lg ring-1 ring-emerald-500/30">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.image} alt={c.card_name} className="h-20 w-14 object-cover" />
                            </div>
                          )}
                          <p className="mt-1 truncate text-center text-[10px] text-slate-400" title={c.card_name}>
                            {c.card_name}
                          </p>
                        </div>
                      ))}
                      {o.cash_offered > 0 && (
                        <div className="flex h-20 w-14 items-center justify-center rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/10">
                          <p className="text-center text-[10px] font-bold text-emerald-400">
                            +${o.cash_offered.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                    {favorable && (
                      <span className="mt-2 inline-block rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Te conviene ✓ · {tradeValueText(o.totalRequested, o.totalOffered)}
                      </span>
                    )}
                  </div>

                  {o.message && (
                    <p className="mx-5 mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm italic text-slate-400">
                      “{o.message}”
                    </p>
                  )}

                  {/* Contraparte */}
                  <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-950/60 px-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20 text-sm font-bold text-fuchsia-300 ring-1 ring-fuchsia-500/20">
                      {(other.username[0] ?? '?').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">@{other.username}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        {location || 'Sin ubicación'} ·{' '}
                        <time dateTime={o.created_at} title={dateFmt(o.created_at)}>
                          {timeAgo(o.created_at)}
                        </time>
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-auto flex flex-col gap-2 p-5 pt-3">
                    {inbox === 'received' && status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(o.id, 'accepted')}
                          disabled={actingId === o.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Aceptar oferta
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(o.id, 'rejected')}
                          disabled={actingId === o.id}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {inbox === 'received' && status === 'accepted' && (
                      <a
                        href={confirmWhatsApp(o)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500"
                      >
                        <ChatIcon width={15} height={15} />
                        Coordinar entrega por WhatsApp
                      </a>
                    )}

                    {inbox === 'sent' && status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(o.id, 'cancelled')}
                        disabled={actingId === o.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
                      >
                        Cancelar oferta
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
