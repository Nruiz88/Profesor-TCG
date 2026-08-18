'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pokémon fantasma que aparecen y scrollean con la página.
 * 2 a la izquierda (0-20%), 2 a la derecha (80-100%), margen central de 20%.
 * Rotan entre grupos cada ~15 segundos.
 */

interface Ghost {
  id: number
  name: string
  x: number
  y: number
  size: number
  duration: number
  driftX: number
  driftY: number
}

const ALL_GHOSTS = [
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

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Genera 4 fantasmas: 2 en el lado izquierdo (0-18%) y 2 en el derecho (82-100%).
 * La posición vertical se elige aleatoriamente a lo largo de toda la página.
 */
function generateGroup(indices: number[]): Ghost[] {
  const shuffled = shuffleArray(indices)
  const selected = shuffled.slice(0, 4)

  return selected.map((i, idx) => {
    const isLeft = idx < 2
    return {
      ...ALL_GHOSTS[i],
      // Lado izquierdo: 0-18%, lado derecho: 82-98%
      x: isLeft ? rand(0, 18) : rand(82, 98),
      // Posición vertical: distribuida a lo largo de la página
      y: rand(5, 80),
      size: rand(80, 150),
      duration: rand(10, 18),
      driftX: isLeft ? rand(-15, 5) : rand(-5, 15),
      driftY: rand(-30, -10)
    }
  })
}

// 3 grupos para rotar
const GROUPS: number[][] = [
  [0, 1, 2, 3],     // Gengar, Gastly, Haunter, Misdreavus
  [4, 5, 6, 7],     // Litwick, Phantump, Dreepy, Sableye
  [8, 9, 0, 1]      // Spiritomb, Chandelure, + repetidos
]

export default function GhostPokemon() {
  const [visible, setVisible] = useState<Ghost[]>([])
  const groupIndex = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNextGroup = useCallback(() => {
    const group = GROUPS[groupIndex.current % GROUPS.length]
    const selected = generateGroup(group)
    setVisible(selected)
    groupIndex.current++
    timerRef.current = setTimeout(showNextGroup, rand(14000, 20000))
  }, [])

  useEffect(() => {
    showNextGroup()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [showNextGroup])

  if (visible.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ghost-float {
          0%   { opacity: 0; transform: translateY(12px) scale(0.65); filter: blur(5px); }
          18%  { opacity: 0.45; transform: translateY(0) scale(1); filter: blur(0); }
          82%  { opacity: 0.35; transform: translate(var(--dx), var(--dy)) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(calc(var(--dx) * 1.3), calc(var(--dy) * 1.4)) scale(0.55); filter: blur(7px); }
        }
        .ghost-sprite {
          animation: ghost-float var(--dur) ease-in-out forwards;
          will-change: opacity, transform, filter;
        }
      `}</style>

      {visible.map((g) => (
        <img
          key={`${g.id}-${groupIndex.current}-${Date.now()}`}
          src={spriteUrl(g.id)}
          alt=""
          className="ghost-sprite absolute"
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: g.size,
            height: g.size,
            '--dx': `${g.driftX}px`,
            '--dy': `${g.driftY}px`,
            '--dur': `${g.duration}s`,
            opacity: 0
          } as React.CSSProperties}
          loading="lazy"
        />
      ))}
    </div>
  )
}
