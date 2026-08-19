'use client'

import { useRef, useCallback } from 'react'

interface TrainerCredentialCardProps {
  username: string
  city: string | null
  country: string | null
  isVerified: boolean
  /** Rango de Entrenador (XP unificada), opcional */
  rank?: { icon: string; name: string } | null
}

/**
 * Tarjeta de Credencial estilo Pokémon Card con efecto holográfico CSS puro.
 * El rainbow sigue el mouse y el brillo se anima automáticamente.
 */
export default function TrainerCredentialCard({
  username,
  city,
  country,
  isVerified,
  rank
}: TrainerCredentialCardProps) {
  const initial = (username[0] ?? '?').toUpperCase()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const hue = Math.round((x / 100) * 360)
    card.style.setProperty('--hue', `${hue}deg`)
    card.style.setProperty('--mouse-x', `${x}`)
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* Glow detrás de la carta */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-[#00ffcc]/30 via-violet-500/30 to-fuchsia-500/30 opacity-60 blur-xl" />

      {/* Carta principal con borde holográfico animado */}
      <div className="relative overflow-hidden rounded-[2rem] p-[3px] shadow-[0_0_40px_rgba(0,255,204,0.25),0_0_80px_rgba(139,92,246,0.15)]" style={{ background: 'linear-gradient(var(--hue, 135deg), #00ffcc, #8b5cf6, #f472b6, #00ffcc)' }}>
        {/* Interior de la carta con efecto holo */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          className="holo-card relative overflow-hidden rounded-[calc(2rem-3px)] bg-[#080c15]"
        >
          {/* Patrón de fondo "POKÉMON" watermark */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 font-black uppercase leading-none tracking-widest text-white">
              {Array(20).fill('POKÉMON').map((t, i) => (
                <span key={i} className="text-[2rem]">{t}</span>
              ))}
            </div>
          </div>

          {/* Contenido de la carta */}
          <div className="relative z-20 flex flex-col items-center px-6 pt-6 pb-5">
            {/* Header: pokeball + nombre usuario */}
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                {isVerified && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00ffcc] text-[10px] text-[#080c15] shadow-[0_0_10px_rgba(0,255,204,0.6)]">
                    ✓
                  </span>
                )}
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffcc]">
                  {username}
                </span>
              </div>
              {/* Pokéball icon */}
              <div className="relative h-6 w-6">
                <div className="absolute inset-0 rounded-full border-2 border-slate-600 bg-gradient-to-b from-red-500 to-red-600">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-600" />
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-600 bg-white" />
                </div>
              </div>
            </div>

            {/* Avatar grande con glow */}
            <div className="relative mt-5">
              <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-gradient-to-br from-[#00ffcc]/20 via-violet-500/20 to-fuchsia-500/20 text-5xl font-black text-white ring-2 ring-[#00ffcc]/30 shadow-[0_0_40px_rgba(0,255,204,0.3)]">
                {initial}
              </div>
              {isVerified && (
                <span
                  className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#00ffcc] text-sm font-bold text-[#080c15] shadow-[0_0_15px_rgba(0,255,204,0.6)] ring-2 ring-[#080c15]"
                  title="Verificado"
                >
                  ✓
                </span>
              )}
            </div>

            {/* Nombre (estilo FaceBinder: nombre / APELLIDO) */}
            <div className="mt-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                {username.split('.')[0] || username}
              </p>
              <h2 className="mt-0.5 text-3xl font-black uppercase tracking-tight text-white">
                {username.split('.').pop() || username}
              </h2>
            </div>

            {/* Rol */}
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffcc]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00ffcc] shadow-[0_0_6px_rgba(0,255,204,0.8)]" />
              Coleccionista
            </span>

            {/* País / Ciudad / Rango */}
            <div className="mt-5 w-full space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">País</span>
                <span className="font-mono text-xs font-bold uppercase text-white">{country ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Ciudad</span>
                <span className="font-mono text-xs font-bold uppercase text-white">{city ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Rango</span>
                <span className="font-mono text-xs font-bold text-[#00ffcc]">
                  {rank ? `${rank.icon} ${rank.name}` : '—'}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}