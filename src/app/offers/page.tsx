'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import {
  normalizeOfferStatus,
  tradeIsFavorable,
  tradeValueText,
  TRADE_OFFER_STATUS_META,
  type TradeOfferView
} from '@/lib/tradeOffers'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { ChatIcon, SwapIcon } from '@/components/icons'

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
      whatsAppLink(sender.whatsapp_number ?? '') +
      `?text=${encodeURIComponent(
        `Hola @${sender.username}! Acepté tu oferta por "${offer.requested.card_name}" en Profesor TCG. Coordinemos la entrega del intercambio.`
      )}`
    )
  }

  const dateFmt = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <SiteNav active="offers" />

      <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Encabezado con acento neón */}
      <header className="relative mb-6 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/70 to-transparent" />
        <div className="pointer-events-none absolute -top-24 right-0 h-48 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/40">
                <SwapIcon width={18} height={18} />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Bandeja de ofertas</h1>
                <p className="text-xs text-slate-500">
                  Intercambios propuestos entre binders de la comunidad.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/binder"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              ← Mi binder
            </Link>
            <Link
              href="/explore"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Explorar
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs estilo segmentado */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {(
          [
            { id: 'received', label: '📥 Ofertas recibidas' },
            { id: 'sent', label: '📤 Ofertas enviadas' }
          ] as { id: Inbox; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setInbox(t.id)}
            aria-pressed={inbox === t.id}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              inbox === t.id
                ? 'bg-binder-accent text-white shadow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando ofertas…</p>
      ) : offers.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 px-6 py-16 text-center backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/40 to-transparent" />
          <p className="text-lg font-semibold text-white">
            Sin ofertas {inbox === 'received' ? 'recibidas' : 'enviadas'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            {inbox === 'received'
              ? 'Cuando alguien proponga un intercambio por una de tus cartas, aparece acá.'
              : 'Proponé un cambio desde la ficha pública de otro coleccionista y lo vas a ver acá.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
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
                className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-colors hover:border-slate-700"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

                {/* Cabecera: quién propuso + estado */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-sm font-bold text-white shadow">
                      {(other.username[0] ?? 'C').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <Link
                          href={`/profile/${encodeURIComponent(other.username)}`}
                          className="font-semibold text-white transition-colors hover:text-rose-300"
                        >
                          @{other.username}
                        </Link>{' '}
                        <span className="text-slate-500">
                          {inbox === 'received' ? 'propone un intercambio' : 'recibirá tu oferta'}
                        </span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {location || 'Ubicación no especificada'} ·{' '}
                        <time dateTime={o.created_at} title={dateFmt(o.created_at)}>
                          {timeAgo(o.created_at)}
                        </time>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Comparativa Quiere / Ofrece */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-rose-500/20 bg-slate-950/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-400/80">
                      Quiere
                    </p>
                    <div className="mt-2 flex gap-3">
                      {o.requested.image && (
                        <div className="shrink-0 overflow-hidden rounded-lg ring-1 ring-rose-500/40 shadow-[0_0_14px_rgba(244,63,94,0.2)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={o.requested.image}
                            alt={o.requested.card_name}
                            className="h-20 w-14 object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {o.requested.card_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {o.requested.set_id.toUpperCase()} {o.requested.number}
                        </p>
                        <p className="mt-1 text-sm font-bold text-yellow-400">
                          {fmt(o.requested.price)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-slate-950/60 p-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500/80">
                      Ofrece{`${o.offered.length > 0 ? ` (${o.offered.length})` : ''}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.offered.map((c) => (
                        <div key={c.id} className="w-14">
                          {c.image && (
                            <div className="overflow-hidden rounded-lg ring-1 ring-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={c.image}
                                alt={c.card_name}
                                className="h-20 w-14 object-cover"
                              />
                            </div>
                          )}
                          <p
                            className="mt-1 truncate text-center text-[10px] text-slate-400"
                            title={c.card_name}
                          >
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
                    <p className="mt-2 text-sm font-bold text-yellow-400">{fmt(o.totalOffered)}</p>
                  </div>
                </div>

                {/* Valor comparativo */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-300">
                    Valor del intercambio:{' '}
                    <span className="font-bold text-yellow-400">
                      {tradeValueText(o.totalRequested, o.totalOffered)}
                    </span>
                  </p>
                  {favorable && (
                    <span className="rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Te conviene ✓
                    </span>
                  )}
                </div>

                {o.message && (
                  <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm italic text-slate-400">
                    “{o.message}”
                  </p>
                )}

                {/* Acciones */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {inbox === 'received' && status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateStatus(o.id, 'accepted')}
                        disabled={actingId === o.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Aceptar oferta
                      </button>
                      <button
                        onClick={() => updateStatus(o.id, 'rejected')}
                        disabled={actingId === o.id}
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500"
                    >
                      <ChatIcon width={14} height={14} />
                      Coordinar entrega por WhatsApp
                    </a>
                  )}

                  {inbox === 'sent' && status === 'pending' && (
                    <button
                      onClick={() => updateStatus(o.id, 'cancelled')}
                      disabled={actingId === o.id}
                      className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
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
