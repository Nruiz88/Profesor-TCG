'use client'

import { useEffect, useState } from 'react'

/**
 * Pokémon fantasma que aparecen y desaparecen en el fondo.
 * Cada uno aparece individualmente, se mueve suavemente, y se desvanece.
 * Inspirado en el comportamiento de Gengar/Gastly en los juegos.
 */

interface Ghost {
  id: number
  name: string
  /** Posición inicial aleatoria */
  x: number
  y: number
  /** Tamaño en px */
  size: number
  /** Duración total del ciclo (aparecer + moverse + desaparecer) */
  duration: number
  /** Delay antes de aparecer */
  delay: number
  /** Dirección del movimiento horizontal */
  driftX: number
  /** Dirección del movimiento vertical */
  driftY: number
}

const GHOSTS = [
  { id: 94, name: 'Gengar' },
  { id: 92, name: 'Gastly' },
  { id: 93, name: 'Haunter' },
  { id: 200, name: 'Misdreavus' },
  { id: 607, name: 'Litwick' },
  { id: 708, name: 'Phantump' },
  { id: 885, name: 'Dreepy' },
  { id: 302, name: 'Sableye' },
  { id: 442, name: 'Spiritomb' },
  { id: 609, name: 'Chandelure' }
]

function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateGhosts(): Ghost[] {
  return GHOSTS.map((g) => ({
    ...g,
    x: randomBetween(5, 90),
    y: randomBetween(5, 85),
    size: randomBetween(60, 120),
    duration: randomBetween(8, 16),
    delay: randomBetween(0, 20),
    driftX: randomBetween(-30, 30),
    driftY: randomBetween(-40, -10)
  }))
}

export default function GhostPokemon() {
  const [ghosts, setGhosts] = useState<Ghost[]>([])

  useEffect(() => {
    setGhosts(generateGhosts())
  }, [])

  if (ghosts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ghost-appear {
          0%   { opacity: 0; transform: translateY(10px) scale(0.7); filter: blur(4px); }
          15%  { opacity: 0.2; transform: translateY(0) scale(1); filter: blur(0); }
          85%  { opacity: 0.15; transform: translate(var(--drift-x), var(--drift-y)) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(calc(var(--drift-x) * 1.3), calc(var(--drift-y) * 1.5)) scale(0.6); filter: blur(6px); }
        }
        .ghost-sprite {
          animation: ghost-appear var(--duration) ease-in-out var(--delay) infinite;
          will-change: opacity, transform, filter;
        }
      `}</style>

      {ghosts.map((g) => (
        <img
          key={g.id}
          src={spriteUrl(g.id)}
          alt=""
          className="ghost-sprite absolute"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: g.size,
            height: g.size,
            '--drift-x': `${g.driftX}px`,
            '--drift-y': `${g.driftY}px`,
            '--duration': `${g.duration}s`,
            '--delay': `${g.delay}s`,
            opacity: 0
          } as React.CSSProperties}
          loading="lazy"
        />
      ))}
    </div>
  )
}
