'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { SellerInfo } from '@/components/SellerInfoBadge'
import { whatsAppLink } from '@/lib/profile'
import { CARD_STATUS_META, normalizeStatus } from '@/lib/cardStatus'

interface ClaimModalProps {
  card: SlotCard
  seller: SellerInfo | null
  onClose: () => void
}

export default function ClaimModal({ card, seller, onClose }: ClaimModalProps) {
  const status = normalizeStatus(card.status)
  const [ownCards, setOwnCards] = useState<SlotCard[] | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [selectedOwn, setSelectedOwn] = useState<SlotCard | null>(null)

  const sellerName = seller?.username ? `@${seller.username}` : 'coleccionista'

  // Cargar las cartas propias (si hay sesión) para proponer cambio
  useEffect(() => {
    let active = true
    fetch('/api/binder?all=1')
      .then(async (res) => {
        if (!res.ok) {
          if (active) setLoggedIn(false)
          return
        }
        const data = await res.json()
        if (!active) return
        setLoggedIn(true)
        setOwnCards(data.cards || [])
      })
      .catch(() => {
        if (active) setLoggedIn(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Mensaje pre-armado para el claim
  const claimUrl = whatsAppLink(
    seller?.whatsapp_number ?? ''
  ) + `?text=${encodeURIComponent(
    `Hola ${sellerName}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en tu binder de Profesor TCG. ¿Sigue disponible? Quiero hacer un claim.`
  )}`

  const tradeUrl = selectedOwn
    ? whatsAppLink(seller?.whatsapp_number ?? '') +
      `?text=${encodeURIComponent(
        `Hola ${sellerName}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en tu binder. Te propongo un intercambio por mi "${selectedOwn.card_name}" (${selectedOwn.set_id.toUpperCase()} ${selectedOwn.number}). ¿Te interesa?`
      )}`
    : null

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
          {status !== 'collection' && (
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {CARD_STATUS_META[status].label}
            </span>
          )}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {/* Claim directo */}
          <a
            href={claimUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Hacer Claim en WhatsApp
          </a>

          {/* Proponer cambio */}
          {loggedIn === false ? (
            <a
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Iniciá sesión para proponer un cambio
            </a>
          ) : loggedIn === null ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
              Cargando tus cartas…
            </p>
          ) : ownCards && ownCards.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-center text-sm text-slate-500">
              No tenés cartas en tu binder para ofrecer.
            </p>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-400">Proponé un cambio con una de tus cartas:</p>
              <select
                value={selectedOwn?.id ?? ''}
                onChange={(e) => {
                  const c = ownCards?.find((x) => x.id === e.target.value) ?? null
                  setSelectedOwn(c)
                }}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 focus:border-binder-accent focus:outline-none"
              >
                <option value="">Elegí una carta tuya…</option>
                {ownCards?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} ({c.set_id.toUpperCase()} {c.number})
                  </option>
                ))}
              </select>
              {tradeUrl && (
                <a
                  href={tradeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-sky-500"
                >
                  Enviar propuesta por WhatsApp
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
