'use client'

import { useEffect, useRef, useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import type { ExploreCard } from '@/app/api/public/explore/route'
import { whatsAppLink } from '@/lib/profile'
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

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/**
 * Modal del market (Home V2): diseño unificado para mobile y desktop, vertical
 * y centrado:
 *   carta grande (protagonista) → nombre + logo de set → Comprar + Precio.
 * La carta tiene un efecto 3D táctil SUAVE (balanceo idle + tilt corto al
 * arrastrar) que no la recorta al moverse.
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

  // ── Efecto 3D táctil: solo en pantallas touch (en desktop el hover nativo
  //    de PokemonCard ya rota la carta). Balanceo idle + arrastre para rotar.
  const [isTouch, setIsTouch] = useState(false)
  const tiltRef = useRef<HTMLDivElement>(null)
  const tilt = useRef({
    rx: 0,
    ry: 0,
    tx: 0,
    ty: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastMove: 0,
    phase: 0,
    raf: 0
  })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setIsTouch(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (!isTouch) return
    const st = tilt.current
    const loop = (now: number) => {
      const idleMs = now - st.lastMove
      if (!st.dragging && idleMs > 1600) {
        // Balanceo suave cuando nadie toca la carta
        const t = (now - st.phase) / 12000
        st.tx = Math.sin(t * Math.PI * 2) * 2.5
        st.ty = Math.sin(t * Math.PI * 2 * 1.3 + 1.1) * 3.5
      }
      st.rx += (st.tx - st.rx) * 0.08
      st.ry += (st.ty - st.ry) * 0.08
      if (tiltRef.current) {
        tiltRef.current.style.transform = `rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg)`
      }
      st.raf = requestAnimationFrame(loop)
    }
    st.phase = performance.now()
    st.lastMove = performance.now()
    st.raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(st.raf)
  }, [isTouch])

  const onTiltDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = tilt.current
    st.dragging = true
    st.lastX = e.clientX
    st.lastY = e.clientY
    st.lastMove = performance.now()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onTiltMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = tilt.current
    if (!st.dragging) return
    const dx = e.clientX - st.lastX
    const dy = e.clientY - st.lastY
    st.lastX = e.clientX
    st.lastY = e.clientY
    st.tx = clamp(st.tx + dy * 0.2, -9, 9)
    st.ty = clamp(st.ty - dx * 0.2, -9, 9)
    st.lastMove = performance.now()
  }

  const endTilt = () => {
    const st = tilt.current
    st.dragging = false
    st.phase = performance.now()
  }

  return (
    <div className="modal-overlay v2m-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2m-container" onClick={(e) => e.stopPropagation()}>
        {/* Cerrar */}
        <button onClick={onClose} aria-label="Cerrar" className="v2m-close">
          ✕
        </button>

        {/* Carta protagonista (centrada, ocupa el resto del alto) */}
        <div className="v2m-cardcol">
          <div className="v2m-glow" aria-hidden="true" />
          <div className="v2m-imgwrap">
            {isTouch ? (
              <div
                ref={tiltRef}
                className="v2m-tilt"
                style={{ transformStyle: 'preserve-3d' } as React.CSSProperties}
                onPointerDown={onTiltDown}
                onPointerMove={onTiltMove}
                onPointerUp={endTilt}
                onPointerCancel={endTilt}
                onPointerLeave={endTilt}
              >
                <PokemonCard card={exploreToSlot(card, { forceHolo: true })} />
              </div>
            ) : (
              <PokemonCard card={exploreToSlot(card, { forceHolo: true })} />
            )}
          </div>
        </div>

        {/* Nombre + logo/nº de set (debajo de la carta) */}
        <div className="v2m-nameblock">
          <h2 className="v2m-name">{card.card_name}</h2>
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

        {/* Comprar (WhatsApp) + Precio al lado */}
        <div className="v2m-buyrow">
          {card.whatsapp_number ? (
            <a
              href={claimHref(card)}
              target="_blank"
              rel="noopener noreferrer"
              className={`v2m-whatsapp ${isSale ? 'v2m-whatsapp--sale' : 'v2m-whatsapp--trade'}`}
            >
              {isSale ? '💬 Comprar por WhatsApp' : '🔄 Proponer Swap'}
            </a>
          ) : (
            <span className="v2m-nocontact">Sin contacto directo</span>
          )}
          {isSale ? (
            <span className="v2m-price">${fmtUsd(card.price!)}</span>
          ) : (
            <span className="v2m-trade">🔄 Swap</span>
          )}
        </div>
      </div>
    </div>
  )
}