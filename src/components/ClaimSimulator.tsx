'use client'

import { useState } from 'react'
import PokemonCard from '@/components/PokemonCard'
import type { SlotCard } from '@/lib/sheets'
import { CheckIcon, RefreshIcon, ShieldIcon } from '@/components/icons'

// Carta demo con imagen real verificada (Scrydex) para que el simulador
// siempre renderice, sin depender del marketplace.
const DEMO_CARD: SlotCard = {
  id: 'sv3pt5-199',
  binder_id: 'demo',
  card_id: 'sv3pt5-199',
  card_name: 'Charizard ex',
  set_id: 'sv3pt5',
  number: '199',
  slot_number: 1,
  market_price: 115.5,
  rarity: 'Special Illustration Rare',
  supertype: 'Pokémon',
  subtypes: ['Stage 2', 'ex'],
  types: ['Fire'],
  condition: 'Near Mint',
  image: 'https://images.scrydex.com/pokemon/sv3pt5-199/large'
}

const CLAIM_PRICE = 115.5
const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Mensaje exacto que vería el vendedor en su chat (template del Claim)
const CLAIM_MESSAGE =
  '¡Hola! 🎴 Hice el CLAIM de tu *Charizard ex* (#SV3PT5 199) por *$115.50 USD* desde tu Binder 3D en Profesor TCG. ¿Cómo coordinamos el pago y envío?'

type Phase = 'idle' | 'typing' | 'sent'

function PhoneIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 8-6 4 6 4V8z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </svg>
  )
}

export default function ClaimSimulator() {
  const [phase, setPhase] = useState<Phase>('idle')

  function startClaim() {
    if (phase !== 'idle') return
    setPhase('typing')
    // 1.2s de "escribiendo…" y después llega el mensaje
    setTimeout(() => setPhase('sent'), 1300)
  }

  function reset() {
    setPhase('idle')
  }

  const isReserved = phase !== 'idle'

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] sm:p-8">
      {/* Glow decorativo */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-binder-accent/10 blur-3xl" />

      <div className="relative grid items-stretch gap-8 lg:grid-cols-2">
        {/* ============ Lado izquierdo: la carta ============ */}
        <div className="flex flex-col items-center rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <div className="relative w-full max-w-[240px]">
            <PokemonCard card={DEMO_CARD} />

            {/* Badge de disponibilidad */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              {!isReserved ? (
                <span
                  key="available"
                  className="animate-badge-flip inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  Disponible
                </span>
              ) : (
                <span
                  key="reserved"
                  className="animate-badge-flip inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                  Reservada
                </span>
              )}
            </div>

            {/* Soft lock aplicado */}
            {phase === 'sent' && (
              <div className="animate-msg-in absolute inset-x-0 -bottom-3 mx-auto w-fit rounded-full border border-amber-400/30 bg-slate-900/90 px-3 py-1 text-[10px] font-semibold text-amber-300 shadow-lg backdrop-blur">
                🔒 Soft Lock 24 h · nadie más puede reclamarla
              </div>
            )}
          </div>

          {/* Datos del slot */}
          <div className="mt-8 w-full text-center">
            <h3 className="text-xl font-bold text-white">{DEMO_CARD.card_name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {DEMO_CARD.rarity} · SV3PT5 · #{DEMO_CARD.number} · Condición:{' '}
              <span className="text-slate-400">{DEMO_CARD.condition}</span>
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              ${fmtUsd(CLAIM_PRICE)}{' '}
              <span className="text-sm font-semibold text-emerald-400/50">USD</span>
            </p>
          </div>

          {/* Botón principal */}
          <div className="mt-6 w-full">
            {phase === 'sent' ? (
              <button
                disabled
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40"
              >
                <CheckIcon width={17} height={17} />
                Claim Realizado
              </button>
            ) : (
              <button
                onClick={startClaim}
                disabled={phase === 'typing'}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-70"
              >
                {phase === 'typing' ? (
                  <>
                    <span className="h-2 w-2 animate-bounce rounded-full bg-white" />
                    Reclamando…
                  </>
                ) : (
                  <>⚡ Simular Claim por WhatsApp</>
                )}
              </button>
            )}
            {phase === 'sent' && (
              <button
                onClick={reset}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-500 hover:text-white"
              >
                <RefreshIcon width={13} height={13} />
                Reiniciar demo
              </button>
            )}
          </div>
        </div>

        {/* ============ Lado derecho: mockup de WhatsApp ============ */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0b141a] shadow-inner">
          {/* Header de WhatsApp */}
          <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-sm font-bold text-white shadow">
              C
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#e9edef]">
                @coleccionista · {DEMO_CARD.card_name}
              </p>
              <p className="text-[11px] text-emerald-400">en línea</p>
            </div>
            <div className="flex items-center gap-4 text-[#8696a0]">
              <VideoIcon />
              <PhoneIcon />
              <MoreIcon />
            </div>
          </div>

          {/* Área de chat */}
          <div className="relative flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 py-4">
            {/* Pattern sutil del fondo de chat de WhatsApp */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, #e9edef 1px, transparent 0)',
                backgroundSize: '22px 22px'
              }}
            />

            {phase === 'idle' && (
              <div className="relative flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#202c33] text-[#8696a0]">
                  <ChatPlaceholderIcon />
                </span>
                <p className="max-w-[240px] text-xs leading-relaxed text-[#8696a0]">
                  Hacé clic en{' '}
                  <span className="font-semibold text-emerald-400">“Simular Claim”</span> para ver el
                  mensaje automático que llega al chat del vendedor.
                </p>
              </div>
            )}

            {/* Indicador de escritura */}
            {phase === 'typing' && (
              <div className="animate-msg-in relative flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-[#202c33] px-4 py-3 shadow">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="animate-typing-dot h-1.5 w-1.5 rounded-full bg-[#8696a0]"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            {/* Burbuja del mensaje del claim */}
            {phase === 'sent' && (
              <div className="animate-msg-in relative w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-[#202c33] px-3.5 py-2.5 shadow-lg">
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#e9edef]">
                  {CLAIM_MESSAGE.split('*').map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={i} className="font-bold">
                        {part}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </p>
                <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
                  ahora
                </span>
              </div>
            )}
          </div>

          {/* Input de mensaje */}
          <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2.5">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-[#2a3942] px-4 py-2.5">
              <span className="text-lg leading-none text-[#8696a0]">😊</span>
              <span className="flex-1 text-xs text-[#8696a0]">Mensaje</span>
              <span className="text-[#8696a0]">
                <MoreIcon />
              </span>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white shadow">
              <SendIcon />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatPlaceholderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
