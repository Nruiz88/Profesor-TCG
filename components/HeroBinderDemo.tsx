'use client'

import { useEffect, useRef, useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import type { SlotCard } from '@/lib/sheets'

// Demo de la home: cartas famosas con imágenes reales (Scrydex) verificadas,
// para que el binder 3D siempre renderice sin depender de la red del marketplace.
const DEMO_CARDS: SlotCard[] = [
  {
    id: 'base1-4',
    binder_id: 'demo',
    card_id: 'base1-4',
    card_name: 'Charizard',
    set_id: 'base1',
    number: '4',
    slot_number: 1,
    market_price: 89,
    rarity: 'Rare Holo',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    types: ['Fire'],
    image: 'https://images.scrydex.com/pokemon/base1-4/large'
  },
  {
    id: 'sv9-185',
    binder_id: 'demo',
    card_id: 'sv9-185',
    card_name: "N's Zoroark ex",
    set_id: 'sv9',
    number: '185',
    slot_number: 2,
    market_price: 150,
    rarity: 'Special Illustration Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 1', 'ex'],
    types: ['Darkness'],
    image: 'https://images.scrydex.com/pokemon/sv9-185/large'
  },
  {
    id: 'sv3pt5-199',
    binder_id: 'demo',
    card_id: 'sv3pt5-199',
    card_name: 'Charizard ex',
    set_id: 'sv3pt5',
    number: '199',
    slot_number: 3,
    market_price: 82,
    rarity: 'Special Illustration Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    types: ['Fire'],
    image: 'https://images.scrydex.com/pokemon/sv3pt5-199/large'
  },
  {
    id: 'base1-2',
    binder_id: 'demo',
    card_id: 'base1-2',
    card_name: 'Blastoise',
    set_id: 'base1',
    number: '2',
    slot_number: 4,
    market_price: 58,
    rarity: 'Rare Holo',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    types: ['Water'],
    image: 'https://images.scrydex.com/pokemon/base1-2/large'
  },
  {
    id: 'me2-106',
    binder_id: 'demo',
    card_id: 'me2-106',
    card_name: 'Meowth',
    set_id: 'me2',
    number: '106',
    slot_number: 5,
    market_price: 14,
    rarity: 'Illustration Rare',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Colorless'],
    image: 'https://images.scrydex.com/pokemon/me2-106/large'
  },
  {
    id: 'sv4-199',
    binder_id: 'demo',
    card_id: 'sv4-199',
    card_name: 'Groudon',
    set_id: 'sv4',
    number: '199',
    slot_number: 6,
    market_price: 31,
    rarity: 'Illustration Rare',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Fighting'],
    image: 'https://images.scrydex.com/pokemon/sv4-199/large'
  },
  {
    id: 'base1-15',
    binder_id: 'demo',
    card_id: 'base1-15',
    card_name: 'Venusaur',
    set_id: 'base1',
    number: '15',
    slot_number: 7,
    market_price: 42,
    rarity: 'Rare Holo',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    types: ['Grass'],
    image: 'https://images.scrydex.com/pokemon/base1-15/large'
  },
  {
    id: 'base1-1',
    binder_id: 'demo',
    card_id: 'base1-1',
    card_name: 'Alakazam',
    set_id: 'base1',
    number: '1',
    slot_number: 8,
    market_price: 24,
    rarity: 'Rare Holo',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    types: ['Psychic'],
    image: 'https://images.scrydex.com/pokemon/base1-1/large'
  },
  {
    id: 'base1-58',
    binder_id: 'demo',
    card_id: 'base1-58',
    card_name: 'Pikachu',
    set_id: 'base1',
    number: '58',
    slot_number: 9,
    market_price: 3.5,
    rarity: 'Common',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    types: ['Lightning'],
    image: 'https://images.scrydex.com/pokemon/base1-58/large'
  }
]

const PAGE_COUNT = 3
const POCKETS = 9

// 3 hojas de 9 bolsillos: cada hoja rota la lista para que se vean cartas distintas
function buildSheets(): SlotCard[][] {
  return Array.from({ length: PAGE_COUNT }, (_, p) =>
    Array.from({ length: POCKETS }, (_, i) => {
      const base = DEMO_CARDS[(p * 3 + i) % DEMO_CARDS.length]
      return { ...base, id: `${base.card_id}-p${p}-${i}`, slot_number: i + 1 }
    })
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * Binder 3D interactivo de la hero: arrastrá para rotar (con inercia y
 * balanceo automático cuando queda quieto) y hojear con las flechas o puntos.
 * Puro CSS 3D + pointer events — sin dependencias.
 */
export default function HeroBinderDemo() {
  const sheets = useRef<SlotCard[][] | null>(null)
  if (!sheets.current) sheets.current = buildSheets()

  const [page, setPage] = useState(0)
  const [flipping, setFlipping] = useState(false)

  const binderRef = useRef<HTMLDivElement>(null)
  const s = useRef({
    rx: 0,
    ry: 0, // ángulos actuales
    tx: 0,
    ty: 0, // ángulos objetivo
    vx: 0,
    vy: 0, // velocidad de inercia
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastMove: 0, // timestamp del último movimiento (para el balanceo idle)
    phase: 0,
    raf: 0
  })

  // Bucle de animación: easing hacia el objetivo + inercia + balanceo idle
  useEffect(() => {
    const st = s.current
    const loop = (now: number) => {
      const idleMs = now - st.lastMove
      if (!st.dragging && idleMs > 2200) {
        // Balanceo suave cuando el usuario no toca el binder
        const t = (now - st.phase) / 16000
        st.tx = Math.sin(t * Math.PI * 2) * 3.5
        st.ty = Math.sin(t * Math.PI * 2 * 1.3 + 1.2) * 8
      }
      if (!st.dragging && (Math.abs(st.vx) > 0.002 || Math.abs(st.vy) > 0.002)) {
        st.tx = clamp(st.tx + st.vx, -18, 18)
        st.ty = clamp(st.ty + st.vy, -32, 32)
        st.vx *= 0.93
        st.vy *= 0.93
      }
      st.rx += (st.tx - st.rx) * 0.09
      st.ry += (st.ty - st.ry) * 0.09
      if (binderRef.current) {
        binderRef.current.style.transform = `rotateX(${st.rx.toFixed(2)}deg) rotateY(${st.ry.toFixed(2)}deg)`
      }
      st.raf = requestAnimationFrame(loop)
    }
    st.phase = performance.now()
    st.raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(st.raf)
  }, [])

  const flipTo = (next: number) => {
    if (flipping) return
    setFlipping(true)
    window.setTimeout(() => {
      setPage(next)
      setFlipping(false)
    }, 460)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = s.current
    st.dragging = true
    st.lastX = e.clientX
    st.lastY = e.clientY
    st.lastMove = performance.now()
    st.vx = 0
    st.vy = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = s.current
    if (!st.dragging) return
    const dx = e.clientX - st.lastX
    const dy = e.clientY - st.lastY
    st.lastX = e.clientX
    st.lastY = e.clientY
    st.tx = clamp(st.tx - dy * 0.3, -18, 18)
    st.ty = clamp(st.ty + dx * 0.3, -32, 32)
    st.vx = -dy * 0.3 * 0.06
    st.vy = dx * 0.3 * 0.06
    st.lastMove = performance.now()
  }

  const endDrag = () => {
    s.current.dragging = false
    s.current.phase = performance.now()
  }

  const pageStyle = (i: number): React.CSSProperties => {
    const isCurrent = i === page
    const flippingAway = flipping && isCurrent
    return {
      transform: flippingAway ? 'rotateY(-172deg)' : isCurrent ? 'rotateY(0deg)' : 'rotateY(-172deg)',
      transition: flippingAway
        ? 'transform 460ms cubic-bezier(0.4, 0.2, 0.2, 1)'
        : 'transform 360ms cubic-bezier(0.4, 0.2, 0.2, 1)',
      transformOrigin: 'left center',
      backfaceVisibility: 'hidden',
      zIndex: isCurrent ? 20 : 10 - i,
      pointerEvents: isCurrent ? 'auto' : 'none'
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Glow de fondo */}
      <div className="pointer-events-none absolute -inset-8 rounded-full bg-gradient-to-tr from-binder-accent/20 via-purple-500/10 to-transparent blur-3xl" />

      <div
        className="relative [perspective:1400px]"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {/* El binder completo rota en 3D con el arrastre */}
        <div
          ref={binderRef}
          className="relative h-[330px] w-[240px] cursor-grab select-none active:cursor-grabbing sm:h-[360px] sm:w-[262px]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Tapa trasera (profundidad) */}
          <div
            className="absolute inset-0 rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
            style={{ transform: 'translateZ(-28px)' }}
          />

          {/* Aros del binder */}
          <div className="absolute -left-2 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2.5 w-4 rounded-full border-2 border-slate-500/70 bg-slate-800 shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)]"
                style={{ transform: `translateZ(14px)` }}
              />
            ))}
          </div>

          {/* Pila de hojas (3x3 bolsillos) */}
          <div
            className="absolute inset-0 rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {sheets.current.map((pageCards, i) => (
              <div
                key={i}
                className="absolute inset-0 grid grid-cols-3 items-center justify-items-center gap-1 rounded-lg"
                style={pageStyle(i)}
              >
                {pageCards.map((card) => (
                  <div key={card.id} className="w-[64px] sm:w-[70px]">
                    <PokemonCard card={card} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Etiqueta de la hoja */}
          <div
            className="absolute bottom-1.5 right-2 z-30 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-300"
            style={{ transform: 'translateZ(18px)' }}
          >
            Hoja {page + 1} / {PAGE_COUNT}
          </div>
        </div>
      </div>

      {/* Controles: hojear + pips */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Hoja anterior"
          disabled={page === 0 || flipping}
          onClick={() => flipTo(Math.max(0, page - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-binder-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          ←
        </button>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir a la hoja ${i + 1}`}
              onClick={() => flipTo(i)}
              className={`h-2 w-2 rounded-full transition-all ${
                i === page ? 'w-5 bg-binder-accent' : 'bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Hoja siguiente"
          disabled={page === PAGE_COUNT - 1 || flipping}
          onClick={() => flipTo(Math.min(PAGE_COUNT - 1, page + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition-colors hover:border-binder-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          →
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-slate-500">
        Arrastrá para rotar el binder · usá las flechas para hojear
      </p>
    </div>
  )
}
