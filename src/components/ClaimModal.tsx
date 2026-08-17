'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { SellerInfo } from '@/components/SellerInfoBadge'
import {
  buildWhatsAppLink,
  claimMessage,
  claimPrice,
  binderSlotUrl,
  formatReservedUntil
} from '@/lib/claim'
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
  const [reservedUntil, setReservedUntil] = useState<string | null>(null)

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
      currency: card.currency ?? null,
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
      setReservedUntil(data.reserved_until ?? null)
      // Abrir el deep link de WhatsApp de forma confiable: window.open()
      // después de un await suele ser bloqueado por el popup blocker, así que
      // simulamos un click real en un <a target="_blank"> (como hizo el usuario).
      const a = document.createElement('a')
      a.href = claimUrl
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      setClaimState('error')
      setClaimError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div className="modal-card modal-card--md" onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Acciones para ${card.card_name}`}
      >
        <div className="modal-header">
          <h2 className="modal-title">{card.card_name}</h2>
          <button onClick={onClose} className="modal-close">
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
          <div className="banner banner--ok mt-4">
            ✅ <strong>¡Claim aplicado!</strong> La carta quedó reservada para vos{" "}
            {reservedUntil ? (
              <strong>hasta {formatReservedUntil(reservedUntil)}</strong>
            ) : (
              <strong>24 horas</strong>
            )}
            . Te abrimos WhatsApp para coordinar con {sellerName}.
          </div>
        )}
        {claimState === 'ok' && loggedIn === true && (
          <a
            href="/binder"
            className="mt-2 block text-center text-xs font-medium text-sky-400 transition-colors hover:text-sky-300"
          >
            Seguí el estado en Mis transacciones →
          </a>
        )}
        {claimState === 'taken' && (
          <div className="banner banner--warn mt-4">
            ⏳ Esta carta <strong>ya está reservada</strong> por otro claim. Podés igual escribirle al
            vendedor para preguntar si sigue disponible.
          </div>
        )}
        {claimState === 'error' && (
          <div className="banner banner--error mt-4">
            No se pudo aplicar el claim: {claimError}. Igual podés escribirle al vendedor.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {/* Claim directo con soft lock */}
          <button
            onClick={handleClaim}
            disabled={claimState === 'claiming' || claimState === 'ok'}
            className="btn-claim btn-claim--emerald"
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
              className="btn-claim btn-claim--ghost"
            >
              Escribir directo por WhatsApp (sin reservar)
            </a>
          )}

          {/* Proponer intercambio formal (oferta en la bandeja) */}
          {loggedIn === false ? (
            <a
              href="/login"
              className="btn-claim btn-claim--ghost"
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
              className="btn-claim btn-claim--sky"
            >
              Proponer cambio con mi binder
            </button>
          )}
        </div>

        <p className="note mt-4">
          Al hacer claim la carta queda reservada 24&nbsp;h para que coordines con el vendedor.
        </p>
      </div>

      {showOffer && seller && (
        <MakeTradeOfferModal card={card} seller={seller} onClose={() => setShowOffer(false)} />
      )}
    </div>
  )
}
