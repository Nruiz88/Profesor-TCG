'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  normalizeOfferStatus,
  tradeIsFavorable,
  tradeValueText,
  TRADE_OFFER_STATUS_META,
  type TradeOfferView
} from '@/lib/tradeOffers'
import { formatLocation, whatsAppLink } from '@/lib/profile'

type Inbox = 'received' | 'sent'

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bandeja de ofertas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Intercambios propuestos entre binders de la comunidad.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/binder" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
            ← Mi binder
          </Link>
          <Link href="/explore" className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
            Explorar
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {(
          [
            { id: 'received', label: 'Ofertas recibidas' },
            { id: 'sent', label: 'Ofertas enviadas' }
          ] as { id: Inbox; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setInbox(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              inbox === t.id
                ? 'bg-binder-accent/20 text-binder-accent ring-1 ring-binder-accent/40'
                : 'border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-white">Sin ofertas {inbox === 'received' ? 'recibidas' : 'enviadas'}</p>
          <p className="mt-1 text-sm text-slate-500">
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
            const other =
              inbox === 'received' ? o.sender : o.receiver
            const favorable =
              status === 'pending' && inbox === 'received' && tradeIsFavorable(o.totalRequested, o.totalOffered)
            return (
              <div
                key={o.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                {/* Cabecera */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-slate-500">{dateFmt(o.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {inbox === 'received' ? 'De' : 'Para'}{' '}
                    <span className="font-semibold text-slate-200">@{other.username}</span>
                    {formatLocation(other.city, other.country) &&
                      ` · ${formatLocation(other.city, other.country)}`}
                  </p>
                </div>

                {/* Comparativa */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Quiere</p>
                    <div className="mt-2 flex gap-3">
                      {o.requested.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.requested.image}
                          alt={o.requested.card_name}
                          className="h-20 w-14 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{o.requested.card_name}</p>
                        <p className="text-xs text-slate-500">
                          {o.requested.set_id.toUpperCase()} {o.requested.number}
                        </p>
                        <p className="mt-1 text-sm font-bold text-yellow-400">{fmt(o.requested.price)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      Ofrece{`${o.offered.length > 0 ? ` (${o.offered.length})` : ''}`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {o.offered.map((c) => (
                        <div key={c.id} className="w-14">
                          {c.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={c.image}
                              alt={c.card_name}
                              className="h-20 w-14 rounded-lg object-cover"
                            />
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
                    <p className="mt-2 text-sm font-bold text-yellow-400">{fmt(o.totalOffered)}</p>
                  </div>
                </div>

                {/* Valor comparativo */}
                <p className="mt-3 text-sm text-slate-300">
                  Valor del intercambio: <span className="font-bold text-yellow-400">{tradeValueText(o.totalRequested, o.totalOffered)}</span>
                  {favorable && (
                    <span className="ml-2 rounded-full bg-emerald-600/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      Te conviene ✓
                    </span>
                  )}
                </p>

                {o.message && (
                  <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm italic text-slate-400">
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
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
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
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                    >
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
  )
}
