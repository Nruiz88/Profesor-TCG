'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { SellerInfo } from '@/components/SellerInfoBadge'
import { buildWhatsAppLink, claimMessage, claimPrice, binderSlotUrl } from '@/lib/claim'
import { CARD_STATUS_META, normalizeStatus } from '@/lib/cardStatus'
import MakeTradeOfferModal from './MakeTradeOfferModal'

interface ClaimModalProps {
  card: SlotCard
  seller: SellerInfo | null
  onClose: () => void
}

type ClaimState = 'idle' | 'claiming' | 'ok' | 'taken' | 'error'

export default function ClaimModal({ card, seller, onClose }: ClaimModalProps) {
  const status = normalizeStatus(card.status)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [showOffer, setShowOffer] = useState(false)
  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [claimError, setClaimError] = useState<string | null>(null)

  const sellerName = seller?.username ? `@${seller.username}` : 'coleccionista'
  const price = claimPrice(card)
  const slotUrl = binderSlotUrl(seller?.username, card.id)

  // Detectar si hay sesión (para ofrecer un cambio)
  useEffect(() => {
    let active = true
    fetch('/api/binder?all=1')
      .then(async (res) => {
        if (!res.ok) {
          if (active) setLoggedIn(false)
          return
        }
        await res.json()
        if (active) setLoggedIn(true)
      })
      .catch(() => {
        if (active) setLoggedIn(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Mensaje del claim (template con precio, condición y link al slot)
  const claimUrl = buildWhatsAppLink(
    seller?.whatsapp_number ?? '',
    claimMessage({
      cardName: card.card_name,
      setId: card.set_id,
      number: card.number,
      price,
      condition: card.condition,
      language: card.language ?? null,
      binderSlotUrl: slotUrl,
      sellerName: seller?.username
    })
  )

  // 1) Soft lock 24h en Supabase · 2) abre WhatsApp con el mensaje pre-armado
  async function handleClaim() {
    if (claimState === 'claiming') return
    setClaimState('claiming')
    setClaimError(null)
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: card.id })
      })
      const data = await res.json()
      if (res.status === 409) {
        setClaimState('taken')
        return
      }
      if (!res.ok) throw new Error(data.error || 'Error al reclamar')
      setClaimState('ok')
      // Abrir el deep link de WhatsApp con el mensaje del claim
      window.open(claimUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setClaimState('error')
      setClaimError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Acciones para ${card.card_name}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{card.card_name}</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {card.set_id.toUpperCase()} {card.number}
          {card.condition && <span className="ml-2 text-slate-400">· {card.condition}</span>}
          {status !== 'collection' && (
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {CARD_STATUS_META[status].label}
            </span>
          )}
        </p>

        {/* Estado del claim */}
        {claimState === 'ok' && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            ✅ <strong>¡Claim aplicado!</strong> La carta quedó <strong>reservada 24 horas</strong> para
            vos. Te abrimos WhatsApp para coordinar con {sellerName}.
          </div>
        )}
        {claimState === 'taken' && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            ⏳ Esta carta <strong>ya está reservada</strong> por otro claim. Podés igual escribirle al
            vendedor para preguntar si sigue disponible.
          </div>
        )}
        {claimState === 'error' && (
          <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            No se pudo aplicar el claim: {claimError}. Igual podés escribirle al vendedor.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {/* Claim directo con soft lock */}
          <button
            onClick={handleClaim}
            disabled={claimState === 'claiming' || claimState === 'ok'}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {claimState === 'claiming'
              ? 'Reclamando…'
              : claimState === 'ok'
                ? '✓ Claim aplicado · abriendo WhatsApp'
                : '⚡ Hacer Claim / Reclamar'}
          </button>

          {claimState !== 'ok' && (
            <a
              href={claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Escribir directo por WhatsApp (sin reservar)
            </a>
          )}

          {/* Proponer intercambio formal (oferta en la bandeja) */}
          {loggedIn === false ? (
            <a
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Iniciá sesión para proponer un cambio
            </a>
          ) : loggedIn === null ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
              Cargando…
            </p>
          ) : (
            <button
              onClick={() => setShowOffer(true)}
              className="rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-sky-500"
            >
              Proponer cambio con mi binder
            </button>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-600">
          Al hacer claim la carta queda reservada 24&nbsp;h para que coordines con el vendedor.
        </p>
      </div>

      {showOffer && seller && (
        <MakeTradeOfferModal card={card} seller={seller} onClose={() => setShowOffer(false)} />
      )}
    </div>
  )
}
