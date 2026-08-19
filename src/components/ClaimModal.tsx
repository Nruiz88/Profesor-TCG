'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { formatCondition } from '@/lib/cardCondition'
import { formatPrice } from '@/lib/priceGuide'
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
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [whatsAppOpened, setWhatsAppOpened] = useState(false)

  const sellerName = seller?.username ? `@${seller.username}` : 'coleccionista'
  const price = claimPrice(card)
  const slotUrl = cardPublicUrl(card.id, card.card_name)

  const currentUrl =
    typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/binder'
  const loginHref = `/login?claim=${card.id}&next=${encodeURIComponent(currentUrl)}`
  const signupHref = `/login?mode=signup&claim=${card.id}&next=${encodeURIComponent(currentUrl)}`

  useEffect(() => {
    let active = true
    fetch('/api/binder?all=1')
      .then(async (res) => {
        if (!res.ok) { if (active) setLoggedIn(false); return }
        await res.json()
        if (active) setLoggedIn(true)
      })
      .catch(() => { if (active) setLoggedIn(false) })
    return () => { active = false }
  }, [])

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
  }, [card.id])

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
      if (res.status === 409) { setClaimState('taken'); clearPendingClaim(); return }
      if (res.status === 401) { setClaimState('ok'); setRequiresLogin(true); return }
      if (!res.ok) throw new Error(data.error || 'Error al reclamar')
      setClaimState('ok')
      setRequiresLogin(data.requiresLogin === true)
      setReservedUntil(data.reserved_until ?? null)
      if (data.requiresLogin === true) {
        if (openWhatsApp) openWhatsAppLink()
        return
      }
      clearPendingClaim()
      if (!openWhatsApp) return
      openWhatsAppLink()
    } catch (err) {
      setClaimState('error')
      setClaimError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

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

  const rarityColor = (r: string | null) => {
    if (!r) return 'text-slate-400'
    const lower = r.toLowerCase()
    if (/secret|hyper|rainbow|special illustration/.test(lower)) return 'text-rose-400'
    if (/illustration|art rare/.test(lower)) return 'text-amber-400'
    if (/double rare|rare holo|v|vmax|vstar|ex\b/.test(lower)) return 'text-sky-400'
    return 'text-slate-400'
  }

  return (
    <div className="modal-overlay z-50" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/80 bg-[#0a0e18] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${card.card_name}`}
      >
        {/* Header con imagen de carta + info */}
        <div className="relative flex gap-4 p-5 pb-4">
          {/* Imagen de la carta */}
          <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-800 ring-1 ring-slate-700/50">
            {card.image ? (
              <img
                src={card.image}
                alt={card.card_name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl text-slate-600">🃏</div>
            )}
            {/* Badge de precio superpuesto */}
            {price != null && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                <p className="text-center text-sm font-extrabold text-yellow-400">
                  {formatPrice(price, card.currency)}
                </p>
              </div>
            )}
          </div>

          {/* Info de la carta */}
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="text-lg font-extrabold leading-tight text-white">{card.card_name}</h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-300">
                {card.set_id.toUpperCase()} #{card.number}
              </span>
              {card.rarity && (
                <span className={`rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold ${rarityColor(card.rarity)}`}>
                  {card.rarity}
                </span>
              )}
              {card.condition && (
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {formatCondition(card.condition)}
                </span>
              )}
            </div>

            {/* Tipos de la carta */}
            {card.types && card.types.length > 0 && (
              <div className="mt-2 flex gap-1">
                {card.types.map((t) => (
                  <span key={t} className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[9px] font-semibold uppercase text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Status badge */}
            {status !== 'collection' && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  status === 'for_sale' ? 'bg-emerald-500/15 text-emerald-300' :
                  status === 'for_trade' ? 'bg-sky-500/15 text-sky-300' :
                  'bg-amber-500/15 text-amber-300'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    status === 'for_sale' ? 'bg-emerald-400' :
                    status === 'for_trade' ? 'bg-sky-400' :
                    'bg-amber-400'
                  }`} />
                  {CARD_STATUS_META[status].label}
                </span>
              </div>
            )}
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info del vendedor */}
        {seller?.username && (
          <div className="mx-5 flex items-center gap-3 rounded-xl border border-slate-800/60 bg-slate-900/60 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/20 text-sm font-bold text-rose-300 ring-1 ring-rose-500/20">
              {(seller.username[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${encodeURIComponent(seller.username)}`}
                className="text-sm font-semibold text-white transition-colors hover:text-rose-300"
                onClick={onClose}
              >
                @{seller.username}
              </Link>
              <p className="text-[11px] text-slate-500">
                {seller.city && seller.country ? `${seller.city}, ${seller.country}` :
                 seller.country || seller.city || 'Sin ubicación'}
              </p>
            </div>
          </div>
        )}

        {/* Banners de estado */}
        {claimState === 'ok' && requiresLogin && (
          <div className="mx-5 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">
              {whatsAppOpened ? `✅ Te abrimos WhatsApp con el mensaje a ${sellerName}.` : `🔐 Para aplicar la reserva necesitás una cuenta.`}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
              Al iniciar sesión, la reserva se aplica sola.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a href={loginHref} onClick={() => savePendingClaim(card.id)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-emerald-500">
                🔐 Iniciar sesión para reservar
              </a>
              <a href={signupHref} onClick={() => savePendingClaim(card.id)} className="rounded-xl border border-slate-700 px-4 py-2.5 text-center text-sm font-semibold text-slate-300 transition-colors hover:text-white">
                Crear cuenta gratis
              </a>
            </div>
          </div>
        )}
        {claimState === 'ok' && !requiresLogin && (
          <div className="mx-5 mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-medium text-emerald-200">
              ✅ <strong>¡Claim aplicado!</strong> Reservada {reservedUntil ? `hasta ${formatReservedUntil(reservedUntil)}` : '24 horas'}.
            </p>
            {whatsAppOpened && (
              <p className="mt-1 text-xs text-emerald-200/70">Te abrimos WhatsApp para coordinar.</p>
            )}
          </div>
        )}
        {claimState === 'taken' && (
          <div className="mx-5 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-amber-200">⏳ Esta carta <strong>ya está reservada</strong> por otro claim.</p>
          </div>
        )}
        {claimState === 'error' && (
          <div className="mx-5 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-200">Error: {claimError}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col gap-2.5 p-5 pt-4">
          <button
            onClick={() => void handleClaim()}
            disabled={claimState === 'claiming' || claimState === 'ok'}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 disabled:opacity-50"
          >
            {claimState === 'claiming' ? (
              'Reclamando…'
            ) : claimState === 'ok' ? (
              <>✓ {whatsAppOpened ? 'WhatsApp abierto' : 'Claim aplicado'}</>
            ) : (
              <>⚡ Hacer Claim / Reclamar</>
            )}
          </button>

          {claimState !== 'ok' && (
            <a
              href={claimUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:border-slate-600 hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.37 0-4.567-.814-6.293-2.172l-.44-.358-2.634.883.883-2.634-.358-.44A9.965 9.965 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
              </svg>
              Escribir directo por WhatsApp
            </a>
          )}

          {loggedIn === null ? (
            <div className="h-12 animate-pulse rounded-xl bg-slate-800/50" />
          ) : loggedIn === true ? (
            <button
              onClick={() => setShowOffer(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-300 transition-all hover:-translate-y-0.5 hover:bg-sky-500/20"
            >
              🔄 Proponer cambio con mi binder
            </button>
          ) : null}
        </div>

        <p className="px-5 pb-5 text-center text-[10px] leading-relaxed text-slate-600">
          El claim abre WhatsApp y reserva la carta 24h. Al iniciar sesión se confirma automáticamente.
        </p>

        {showOffer && seller && (
          <MakeTradeOfferModal card={card} seller={seller} onClose={() => setShowOffer(false)} />
        )}
      </div>
    </div>
  )
}
