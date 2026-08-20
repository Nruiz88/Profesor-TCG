'use client'

import { useCallback, useEffect, useState } from 'react'
import { SwapIcon, CheckIcon } from '@/components/icons'
import ReviewModal from './ReviewModal'

interface MyClaim {
  id: string
  status: 'pending' | 'completed' | 'cancelled'
  kind: string
  role: 'buyer' | 'seller'
  counterpart: { id: string; username: string }
  card: { card_name: string; set_id: string; number: string } | null
  created_at: string
  completed_at: string | null
  reviewedByMe: boolean
}

interface ClaimsPanelProps {
  onClose: () => void
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

// Panel "Mis Claims": claims donde el usuario participó (como comprador o
// vendedor), separados en Enviados / Recibidos con su estatus, y la acción
// "Confirmar transacción" que abre el ReviewModal.
export default function ClaimsPanel({ onClose }: ClaimsPanelProps) {
  const [claims, setClaims] = useState<MyClaim[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<MyClaim | null>(null)
  const [view, setView] = useState<'sent' | 'received'>('received')

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/claims/mine')
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error al cargar transacciones')
      setClaims(body.claims ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const pending = (claims ?? []).filter((c) => c.status === 'pending')
  // Cerradas por el vendedor ("Marcar vendida") pero todavía sin calificar por mí
  const unreviewed = (claims ?? []).filter(
    (c) => c.status === 'completed' && !c.reviewedByMe
  )
  const actionCount = pending.length + unreviewed.length

  const sent = (claims ?? []).filter((c) => c.role === 'buyer')
  const received = (claims ?? []).filter((c) => c.role === 'seller')
  const visible = view === 'sent' ? sent : received

  return (
    <div
      className="modal-overlay z-[60]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Mis Claims"
    >
      <div
        className="modal-card modal-card--panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header modal-header--bordered">
          <div className="flex items-center gap-2">
            <SwapIcon className="h-4 w-4 text-sky-400" />
            <h2 className="modal-title">Mis Claims</h2>
          </div>
          <button onClick={onClose} className="modal-close">
            Cerrar
          </button>
        </div>

        {/* Tabs Enviados / Recibidos */}
        <div className="flex gap-1 border-b border-slate-800 px-4 pt-3">
          <button
            type="button"
            onClick={() => setView('received')}
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${
              view === 'received'
                ? 'border border-b-0 border-slate-800 bg-slate-950 text-white'
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
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${
              view === 'sent'
                ? 'border border-b-0 border-slate-800 bg-slate-950 text-white'
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {actionCount > 0 && view === 'received' && (
            <p className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
              Tenés <strong>{actionCount}</strong> transacción
              {actionCount !== 1 ? 'es' : ''} por confirmar o calificar tras coordinarla por
              WhatsApp.
            </p>
          )}

          {error && (
            <p className="banner banner--error">{error}</p>
          )}

          {!claims && !error && (
            <p className="py-10 text-center text-sm text-slate-500">Cargando…</p>
          )}

          {claims && visible.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400">
                {view === 'sent'
                  ? 'Todavía no hiciste ningún claim.'
                  : 'Todavía no recibiste ningún claim.'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {view === 'sent'
                  ? 'Cuando hagas un claim con sesión iniciada, aparece acá.'
                  : 'Cuando alguien reclame una de tus cartas, aparece acá.'}
              </p>
            </div>
          )}

          <ul className="space-y-3">
            {visible.map((c) => {
              const meta = STATUS_META[c.status] ?? STATUS_META.pending
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                      {c.card?.card_name ?? 'Carta'}
                      {c.card && (
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          {c.card.set_id.toUpperCase()} {c.card.number}
                        </span>
                      )}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {c.role === 'buyer' ? 'Compraste' : 'Vendiste'} a{' '}
                    <span className="font-medium text-slate-300">
                      @{c.counterpart.username}
                    </span>{' '}
                    · {KIND_LABEL[c.kind] ?? c.kind} · {formatDate(c.created_at)}
                  </p>

                  {(c.status === 'pending' || (c.status === 'completed' && !c.reviewedByMe)) && (
                    <button
                      onClick={() => setConfirming(c)}
                      className="btn-claim btn-claim--compact btn-claim--emerald mt-3 w-full"
                    >
                      {c.status === 'completed'
                        ? '⭐ Calificar y cerrar'
                        : '✓ Confirmar transacción y calificar'}
                    </button>
                  )}

                  {c.status === 'completed' && c.reviewedByMe && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckIcon className="h-3.5 w-3.5" />
                      Confirmada · ya la calificaste
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
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
