'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import PokemonCard from '@/components/PokemonCard'
import type { ExploreCard } from '@/app/api/public/explore/route'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { formatCondition } from '@/lib/cardCondition'
import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'
import { slugify } from '@/lib/utils'
import { exploreToSlot } from '@/lib/exploreToSlot'
import './MarketCardModal.css'

// Mensaje pre-armado del claim (mismo formato que el resto de la app)
function claimHref(card: ExploreCard): string {
  const seller = `@${card.username}`
  const text = encodeURIComponent(
    `Hola ${seller}! Vi tu carta "${card.card_name}" (${card.set_id.toUpperCase()} ${card.number}) en TCG Claim. ¿Sigue disponible? Quiero hacer un claim.`
  )
  return `${whatsAppLink(card.whatsapp_number ?? '')}?text=${text}`
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * Modal del market (Home V2): carta grande a la izquierda ocupando todo el alto
 * y la info a la derecha (nombre, set · número, precio, idioma, condición,
 * vendedor y acciones).
 */
export default function MarketCardModal({
  card,
  onClose
}: {
  card: ExploreCard
  onClose: () => void
}) {
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

  const isSale = card.status === 'for_sale' && card.price != null
  const langMeta = CARD_LANGUAGE_META[normalizeLanguage(card.language)]
  const condition = formatCondition(card.condition)
  const location = formatLocation(card.city, card.country)
  const binderHref = card.binder_public
    ? `/binder/${encodeURIComponent(card.username)}`
    : `/card/${card.id}/${slugify(card.card_name)}`

  return (
    <div className="modal-overlay v2m-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2m-container" onClick={(e) => e.stopPropagation()}>
        {/* Cerrar */}
        <button onClick={onClose} aria-label="Cerrar" className="v2m-close">
          ✕
        </button>

        {/* Carta protagonista: ocupa la mayor parte del modal */}
        <div className="v2m-cardcol">
          {/* Glow difuso detrás de la carta */}
          <div className="v2m-glow" aria-hidden="true" />
          {/* En mobile el alto lo da el aspect; en desktop se estira a todo el alto */}
          <div className="v2m-imgwrap">
            <PokemonCard card={exploreToSlot(card, { forceHolo: true })} />
          </div>
        </div>

        {/* Info a la derecha */}
        <div className="v2m-info">
          {/* Nombre + set · número (centrado) */}
          <div className="v2m-nameblock">
            <h2 className="v2m-name">{card.card_name}</h2>
            {/* Logo de expansión + número (nombre en tooltip) */}
            <p className="v2m-setline">
              {card.set_logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.set_logo}
                  alt={card.set_name}
                  title={card.set_name}
                  className="v2m-setlogo"
                />
              ) : (
                <span className="v2m-setname">{card.set_name}</span>
              )}
              <span className="v2m-setnum">· {card.number}</span>
            </p>
          </div>

          {/* Precio (debajo) */}
          {isSale ? (
            <p className="v2m-price">${fmtUsd(card.price!)}</p>
          ) : (
            <p className="v2m-trade">Disponible para intercambio</p>
          )}

          {/* Chips: idioma, condición, rareza */}
          <div className="v2m-chips">
            <span className="v2m-chip">
              {langMeta.flag} {langMeta.label}
            </span>
            {condition && (
              <span className="v2m-chip" title={`Estado físico: ${condition}`}>
                {condition}
              </span>
            )}
            {card.rarity && <span className="v2m-chip">{card.rarity}</span>}
          </div>

          {/* Vendedor */}
          <div className="v2m-seller">
            <div className="v2m-sellerrow">
              <span className="v2m-avatar">{(card.username[0] ?? 'C').toUpperCase()}</span>
              <div className="v2m-sellermeta">
                <p className="v2m-sellername">
                  @{card.username}
                  {card.isVerified && (
                    <span className="v2m-verified" title="Usuario verificado">
                      ⚡
                    </span>
                  )}
                </p>
                <p className="v2m-sellerloc">
                  {location || 'Ubicación no especificada'}
                  {card.reviewCount > 0 && card.ratingAvg != null && (
                    <span className="v2m-rating">
                      ★ {card.ratingAvg.toFixed(1)} ({card.reviewCount})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="v2m-actions">
            {card.whatsapp_number ? (
              <a
                href={claimHref(card)}
                target="_blank"
                rel="noopener noreferrer"
                className={`v2m-whatsapp ${isSale ? 'v2m-whatsapp--sale' : 'v2m-whatsapp--trade'}`}
              >
                {isSale ? '💬 Comprar por WhatsApp' : '🔄 Proponer Swap por WhatsApp'}
              </a>
            ) : (
              <span className="v2m-nocontact">Sin contacto directo</span>
            )}
            <Link href={binderHref} className="v2m-binder">
              {card.binder_public ? '📁 Ver binder' : '👁️ Ver carta'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}