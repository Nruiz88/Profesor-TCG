'use client'

import { useCallback, useEffect, useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import ReviewModal from '@/components/ReviewModal'
import { SwapIcon } from '@/components/icons'
import { formatCondition } from '@/lib/cardCondition'
import { formatPrice } from '@/lib/priceGuide'
import type { SlotCard } from '@/lib/sheets'

interface ClaimCard {
  card_name: string
  set_id: string
  number: string
  rarity: string | null
  supertype: string | null
  subtypes: string[] | null
  types: string[] | null
  language: string | null
  condition: string | null
  variant: string
  currency: string
  price: number | null
  image: string
}

interface MyClaim {
  id: string
  status: 'pending' | 'completed' | 'cancelled'
  kind: string
  role: 'buyer' | 'seller'
  counterpart: { id: string; username: string; whatsapp_number: string | null }
  card: ClaimCard | null
  created_at: string
  completed_at: string | null
  reviewedByMe: boolean
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-300' },
  completed: { label: 'Completada', cls: 'bg-emerald-500/15 text-emerald-300' },
  cancelled: { label: 'Cancelada', cls: 'bg-slate-700/50 text-slate-400' }
}

const KIND_LABEL: Record<string, string> = {
  sale: 'Venta',
  trade: 'Cambio',
  both: 'Venta / Cambio'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    })
  } catch {
    return iso
  }
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<MyClaim[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<MyClaim | null>(null)
  const [view, setView] = useState<'sent' | 'received'>('received')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/claims/mine')
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar claims')
      setClaims(body.claims ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar claims')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sent = (claims ?? []).filter((c) => c.role === 'buyer')
  const received = (claims ?? []).filter((c) => c.role === 'seller')
  const visible = view === 'sent' ? sent : received

  function whatsappUrl(c: MyClaim): string | null {
    const phone = (c.counterpart.whatsapp_number ?? '').replace(/\D/g, '')
    if (!phone || !c.card) return null
    const cardName = c.card.card_name
    const setId = (c.card.set_id ?? '').toUpperCase()
    const number = c.card.number ?? ''
    const price = c.card.price != null ? formatPrice(c.card.price, c.card.currency) : ''
    const line1 =
      c.role === 'buyer'
        ? `¡Hola @${c.counterpart.username}! Soy el comprador de *${cardName}* (#${setId} ${number}).`
        : `¡Hola @${c.counterpart.username}! Soy el vendedor de *${cardName}* (#${setId} ${number}).`
    const line2 = price ? ` Te hice/hice el claim por *${price}*.` : ''
    const message = `${line1}${line2} Coordinemos el pago y el envío. 🚀`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  function toSlotCard(c: MyClaim): SlotCard {
    const card = c.card!
    return {
      id: c.id,
      binder_id: '',
      card_id: '',
      card_name: card.card_name,
      set_id: card.set_id,
      number: card.number,
      slot_number: 1,
      rarity: card.rarity,
      supertype: card.supertype,
      subtypes: card.subtypes ?? [],
      types: card.types ?? [],
      variant: card.variant,
      image: card.image
    } as SlotCard
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-rose-500/25 text-xl ring-1 ring-sky-400/30">
            <SwapIcon className="h-5 w-5 text-sky-400" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Mis Claims</h1>
            <p className="text-sm text-slate-500">
              Reservas de cartas donde participás como comprador o vendedor.
            </p>
          </div>
        </div>

        {/* Tabs Enviados / Recibidos */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-1 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setView('received')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
              view === 'received'
                ? 'bg-sky-500/15 text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📥 Recibidos
            {received.length > 0 && (
              <span className="rounded-full bg-slate-800 px-1.5 text-[9px] text-slate-400">
                {received.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setView('sent')}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
              view === 'sent'
                ? 'bg-sky-500/15 text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📤 Enviados
            {sent.length > 0 && (
              <span className="rounded-full bg-slate-800 px-1.5 text-[9px] text-slate-400">
                {sent.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!claims && !error && (
          <p className="py-20 text-center text-slate-500">Cargando…</p>
        )}

        {claims && visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-white">
              {view === 'sent' ? 'No hiciste ningún claim todavía' : 'No recibiste ningún claim todavía'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {view === 'sent'
                ? 'Cuando hagas un claim sobre una carta en venta, aparece acá con su estatus.'
                : 'Cuando alguien reclame una de tus cartas, aparece acá con su estatus.'}
            </p>
          </div>
        )}

        {/* Grid de claims */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.pending
            const wa = whatsappUrl(c)
            return (
              <div
                key={c.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl"
              >
                {/* Carta con animación holo */}
                <div className="flex justify-center bg-gradient-to-b from-slate-950 to-slate-900/40 px-6 pt-6">
                  <div className="w-48">
                    <PokemonCard card={toSlotCard(c)} />
                  </div>
                </div>

                {/* Precio bien notorio */}
                <div className="px-5 pt-4 text-center">
                  {c.card?.price != null ? (
                    <p className="text-3xl font-black tracking-tight text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                      {formatPrice(c.card.price, c.card.currency)}
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-slate-500">Consultar precio</p>
                  )}
                </div>

                {/* Info de la carta */}
                <div className="px-5 pt-3">
                  <h3 className="truncate text-center text-base font-bold text-white">
                    {c.card?.card_name ?? 'Carta'}
                  </h3>
                  <p className="text-center text-xs text-slate-500">
                    {c.card ? `${c.card.set_id.toUpperCase()} · #${c.card.number}` : ''}
                  </p>
                </div>

                {/* Idioma + Condición + Estatus */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 px-5 pt-3">
                  {c.card?.language && (
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      🌐 {c.card.language}
                    </span>
                  )}
                  {c.card?.condition && (
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                      {formatCondition(c.card.condition)}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Contraparte */}
                <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-slate-800/60 bg-slate-950/60 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/20 to-rose-500/20 text-sm font-bold text-sky-300 ring-1 ring-sky-500/20">
                    {(c.counterpart.username[0] ?? '?').toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      @{c.counterpart.username}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {c.role === 'buyer' ? 'Le compraste' : 'Te compró'} ·{' '}
                      {KIND_LABEL[c.kind] ?? c.kind} · {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-2 p-5 pt-3">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-colors hover:bg-emerald-500"
                    >
                      💬 Contactar por WhatsApp
                    </a>
                  )}
                  {(c.status === 'pending' || (c.status === 'completed' && !c.reviewedByMe)) && (
                    <button
                      type="button"
                      onClick={() => setConfirming(c)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/20"
                    >
                      {c.status === 'completed' ? '⭐ Calificar y cerrar' : '✓ Confirmar y calificar'}
                    </button>
                  )}
                  {c.status === 'completed' && c.reviewedByMe && (
                    <p className="text-center text-xs text-emerald-400">✓ Confirmada · ya la calificaste</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {confirming && (
        <ReviewModal
          claimId={confirming.id}
          reviewedUser={confirming.counterpart}
          cardName={confirming.card?.card_name ?? 'la carta'}
          role={confirming.role}
          onClose={() => setConfirming(null)}
          onDone={load}
        />
      )}
    </div>
  )
}
