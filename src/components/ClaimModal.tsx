'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { SellerInfo } from '@/components/SellerInfoBadge'
import {
  buildWhatsAppLink,
  claimMessage,
  claimPrice,
  cardPublicUrl,
  formatReservedUntil
} from '@/lib/claim'
import { CARD_STATUS_META, normalizeStatus } from '@/lib/cardStatus'
import { readPendingClaim, savePendingClaim, clearPendingClaim } from '@/lib/pendingClaim'
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
  /** Claim anónimo: se abrió WhatsApp pero la reserva requiere sesión. */
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [whatsAppOpened, setWhatsAppOpened] = useState(false)

  const sellerName = seller?.username ? `@${seller.username}` : 'coleccionista'
  const price = claimPrice(card)
  const slotUrl = cardPublicUrl(card.id, card.card_name)

  // Al volver de WhatsApp, el claim anónimo pide login/crear cuenta
  // conservando la URL actual (?card=…) para volver a la misma carta.
  const currentUrl =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/binder'
  // ?claim=<card_id>: al loguearse/registrarse, /login aplica la reserva sola
  // y redirige de vuelta a esta misma carta (?next=).
  const loginHref = `/login?claim=${card.id}&next=${encodeURIComponent(currentUrl)}`
  const signupHref = `/login?mode=signup&claim=${card.id}&next=${encodeURIComponent(currentUrl)}`

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

  // Retorno desde /login con ?claim=…: si la reserva ya se aplicó al
  // autenticarse (claim_applied=1) mostramos el éxito directo; si quedó
  // pendiente (p. ej. confirmación de email) y hay sesión, la reaplicamos
  // automáticamente sin volver a abrir WhatsApp.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const applied = params.get('claim_applied') === '1'
    const taken = params.get('claim_taken') === '1'
    if (applied || taken) {
      params.delete('claim_applied')
      params.delete('claim_taken')
      const qs = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
      if (applied) {
        setClaimState('ok')
        setRequiresLogin(false)
        setReservedUntil(card.reserved_until ?? null)
      } else {
        setClaimState('taken')
      }
      return
    }
    const pending = readPendingClaim()
    if (pending && pending.cardId === card.id) {
      void handleClaim(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

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
      cardUrl: slotUrl,
      sellerName: seller?.username
    })
  )

  // 1) Soft lock 24h en Supabase · 2) abre WhatsApp con el mensaje pre-armado.
  // openWhatsApp=false se usa al reaplicar el claim tras el login: el WhatsApp
  // ya se abrió en el paso anónimo, acá solo aplicamos la reserva.
  async function handleClaim(openWhatsApp = true) {
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
        clearPendingClaim()
        return
      }
      if (res.status === 401) {
        // Sin sesión (p. ej. confirmación de email pendiente): pedimos login.
        setClaimState('ok')
        setRequiresLogin(true)
        return
      }
      if (!res.ok) throw new Error(data.error || 'Error al reclamar')
      setClaimState('ok')
      setRequiresLogin(data.requiresLogin === true)
      setReservedUntil(data.reserved_until ?? null)
      if (data.requiresLogin === true) {
        // Sin sesión: el claim es para todos — abrimos WhatsApp igual, pero la
        // reserva queda pendiente (no se limpia la intención) hasta el login.
        if (openWhatsApp) openWhatsAppLink()
        return
      }
      clearPendingClaim()
      if (!openWhatsApp) return // reserva aplicada tras el login
      openWhatsAppLink()
    } catch (err) {
      setClaimState('error')
      setClaimError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // Abrir el deep link de WhatsApp de forma confiable: window.open() después de
  // un await suele ser bloqueado por el popup blocker, así que simulamos un
  // click real en un <a target="_blank"> (como hizo el usuario).
  function openWhatsAppLink() {
    const a = document.createElement('a')
    a.href = claimUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setWhatsAppOpened(true)
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
        {claimState === 'ok' && requiresLogin && (
          <div className="banner banner--warn mt-4">
            <p className="font-medium">
              {whatsAppOpened ? (
                <>✅ Te abrimos WhatsApp con el mensaje del claim a {sellerName}.</>
              ) : (
                <>🔐 Para aplicar la reserva de este claim necesitás una cuenta.</>
              )}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-200/80">
              <strong>Al iniciar sesión o crear tu cuenta, la reserva se aplica sola:</strong> tu
              claim queda registrado en tus transacciones y podés confirmar la compra y calificar
              al vendedor.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={loginHref}
                onClick={() => savePendingClaim(card.id)}
                className="btn-claim btn-claim--compact btn-claim--emerald"
              >
                🔐 Iniciar sesión para reservar
              </a>
              <a
                href={signupHref}
                onClick={() => savePendingClaim(card.id)}
                className="btn-claim btn-claim--compact btn-claim--ghost"
              >
                Crear cuenta gratis
              </a>
            </div>
          </div>
        )}
        {claimState === 'ok' && !requiresLogin && (
          <div className="banner banner--ok mt-4">
            {whatsAppOpened ? (
              <>
                ✅ <strong>¡Claim aplicado!</strong> La carta quedó reservada para vos{" "}
                {reservedUntil ? (
                  <strong>hasta {formatReservedUntil(reservedUntil)}</strong>
                ) : (
                  <strong>24 horas</strong>
                )}
                . Te abrimos WhatsApp para coordinar con {sellerName}.
              </>
            ) : (
              <>
                ✅ <strong>¡Reserva aplicada!</strong> La carta quedó reservada para vos{" "}
                {reservedUntil ? (
                  <strong>hasta {formatReservedUntil(reservedUntil)}</strong>
                ) : (
                  <strong>24 horas</strong>
                )}
                . Coordiná con {sellerName} por WhatsApp.
              </>
            )}
          </div>
        )}
        {claimState === 'ok' && !requiresLogin && loggedIn === true && (
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
          {/* Claim: abre WhatsApp para todos; la reserva se aplica con sesión */}
          <button
            onClick={() => void handleClaim()}
            disabled={claimState === 'claiming' || claimState === 'ok'}
            className="btn-claim btn-claim--emerald"
          >
            {claimState === 'claiming'
              ? 'Reclamando…'
              : claimState === 'ok'
                ? whatsAppOpened
                  ? '✓ Claim aplicado · WhatsApp abierto'
                  : '✓ Claim aplicado · reserva activa'
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
          {loggedIn === null ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
              Cargando…
            </p>
          ) : loggedIn === true ? (
            <button
              onClick={() => setShowOffer(true)}
              className="btn-claim btn-claim--sky"
            >
              Proponer cambio con mi binder
            </button>
          ) : null}
        </div>

        <p className="note mt-4">
          El claim abre WhatsApp al instante; la reserva de 24&nbsp;h se aplica automáticamente al
          iniciar sesión o crear tu cuenta.
        </p>
      </div>

      {showOffer && seller && (
        <MakeTradeOfferModal card={card} seller={seller} onClose={() => setShowOffer(false)} />
      )}
    </div>
  )
}
