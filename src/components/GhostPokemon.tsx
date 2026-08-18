'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Pokémon fantasma que aparecen y desaparecen en el fondo.
 * Máximo 3 visibles a la vez, rotando entre 3 grupos.
 * Cada uno aparece, se mueve, y se desvanece como un fantasma.
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

// 3 grupos de ~3-4 para rotar
const GROUPS: number[][] = [
  [0, 1, 2],       // Gengar, Gastly, Haunter
  [3, 4, 5, 6],    // Misdreavus, Litwick, Phantump, Dreepy
  [7, 8, 9]        // Sableye, Spiritomb, Chandelure
]

function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomizeGhost(g: { id: number; name: string }): Ghost {
  return {
    ...g,
    x: rand(5, 85),
    y: rand(5, 75),
    size: rand(80, 160),
    duration: rand(10, 18),
    driftX: rand(-40, 40),
    driftY: rand(-50, -15)
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function GhostPokemon() {
  const [visible, setVisible] = useState<Ghost[]>([])
  const groupIndex = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showNextGroup = useCallback(() => {
    const group = GROUPS[groupIndex.current % GROUPS.length]
    const shuffled = shuffleArray(group)
    const selected = shuffled.slice(0, 3).map((i) => randomizeGhost(ALL_GHOSTS[i]))
    setVisible(selected)
    groupIndex.current++

    // Rotar cada 12-18 segundos
    const nextDelay = rand(12000, 18000)
    timerRef.current = setTimeout(showNextGroup, nextDelay)
  }, [])

  useEffect(() => {
    showNextGroup()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [showNextGroup])

  if (visible.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ghost-in {
          0%   { opacity: 0; transform: translateY(15px) scale(0.6); filter: blur(6px); }
          20%  { opacity: 0.45; transform: translateY(0) scale(1); filter: blur(0); }
          80%  { opacity: 0.35; transform: translate(var(--dx), var(--dy)) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(calc(var(--dx) * 1.4), calc(var(--dy) * 1.5)) scale(0.5); filter: blur(8px); }
        }
        .ghost-sprite {
          animation: ghost-in var(--dur) ease-in-out forwards;
          will-change: opacity, transform, filter;
        }
      `}</style>

      {visible.map((g) => (
        <img
          key={`${g.id}-${Date.now()}`}
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
