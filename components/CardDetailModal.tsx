'use client'

import { useEffect, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import type { FullCard } from '@/app/api/cards/[cardId]/route'
import { NO_IMAGE_PLACEHOLDER } from '@/lib/cardImage'
import LanguageBadge from './LanguageBadge'

import { TypeIcon } from './TypeIcon'

// Nombres en español para mostrar; los datos internos quedan en inglés (íconos, estilos)
const TYPE_ES: Record<string, string> = {
  Grass: 'Planta',
  Fire: 'Fuego',
  Water: 'Agua',
  Lightning: 'Rayo',
  Psychic: 'Psíquico',
  Fighting: 'Lucha',
  Darkness: 'Oscuridad',
  Metal: 'Metálica',
  Fairy: 'Hada',
  Dragon: 'Dragón',
  Colorless: 'Incolora'
}

const SUBTYPE_ES: Record<string, string> = {
  Basic: 'Básico',
  'Stage 1': 'Fase 1',
  'Stage 2': 'Fase 2',
  'TAG TEAM': 'Tag Team',
  Radiant: 'Radiante',
  Shiny: 'Brillante',
  'Trainer Gallery': 'Galería de Entrenadores'
}

const LEGAL_ES: Record<string, string> = {
  standard: 'Estándar',
  expanded: 'Expandida',
  unlimited: 'Ilimitada'
}

function StatBox({
  label,
  values,
  empty
}: {
  label: string
  values?: { type: string; value: string }[]
  empty?: string
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      {values && values.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 text-xs font-medium text-slate-300">
              <TypeIcon type={v.type} small />
              {v.value}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-slate-600">{empty ?? '—'}</p>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-300">
      {children}
    </span>
  )
}

interface CardDetailModalProps {
  card: SlotCard
  onClose: () => void
}

export default function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const [detail, setDetail] = useState<FullCard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/cards/${card.card_id}`)
      .then(async (res) => {
        const data = await res.json()
        if (!active) return
        if (!res.ok) throw new Error(data.error || 'Error al cargar el detalle')
        setDetail(data.card)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar el detalle')
      })
    return () => {
      active = false
    }
  }, [card.card_id])

  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const name = detail?.name ?? card.card_name
  const setLabel = detail ? `${detail.set_name} · ${detail.number}` : `${card.set_id} · ${card.number}`
  const image = detail?.image ?? card.image
  const price =
    card.market_price != null && card.market_price > 0
      ? card.market_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${name}`}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-white">{name}</h2>
              <LanguageBadge language={card.language} className="shrink-0" />
            </div>
            <p className="truncate text-xs text-slate-500">
              {setLabel}
              {detail?.rarity ? ` · ${detail.rarity}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center gap-5 p-6 sm:flex-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={name}
                className="w-40 rounded-xl shadow-lg"
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = NO_IMAGE_PLACEHOLDER
                }}
              />
              <div>
                <p className="text-sm font-medium text-slate-200">{name}</p>
                <p className="mt-1 text-sm text-red-400">{error}</p>
              </div>
            </div>
          ) : !detail ? (
            <p className="p-10 text-center text-sm text-slate-400">Cargando detalle…</p>
          ) : (
            <div className="grid gap-6 p-5 md:grid-cols-[220px_1fr]">
              {/* Imagen + precio */}
              <div className="mx-auto w-48 md:w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={name}
                  className="aspect-[63/88] w-full rounded-xl shadow-lg"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = NO_IMAGE_PLACEHOLDER
                  }}
                />
                {price && (
                  <div className="mt-3 rounded-xl border border-yellow-400/20 bg-slate-950 px-3 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-yellow-400/50">
                      Precio de mercado · TCGdex
                    </p>
                    <p className="text-lg font-bold text-yellow-400">${price} USD</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 space-y-5">
                {/* Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {detail.supertype && <Chip>{detail.supertype}</Chip>}
                  {detail.subtypes?.map((s) => <Chip key={s}>{SUBTYPE_ES[s] ?? s}</Chip>)}
                  {detail.types?.map((t) => (
                    <Chip key={t}>
                      <span className="inline-flex items-center gap-1.5">
                        <TypeIcon type={t} small />
                        {TYPE_ES[t] ?? t}
                      </span>
                    </Chip>
                  ))}
                  {detail.hp && <Chip>HP {detail.hp}</Chip>}
                  {detail.level && <Chip>Nivel {detail.level}</Chip>}
                </div>

                {detail.evolvesFrom && (
                  <p className="text-sm text-slate-400">
                    Evoluciona de <span className="font-medium text-slate-200">{detail.evolvesFrom}</span>
                  </p>
                )}
                {detail.evolvesTo && detail.evolvesTo.length > 0 && (
                  <p className="text-sm text-slate-400">
                    Evoluciona a{' '}
                    <span className="font-medium text-slate-200">{detail.evolvesTo.join(', ')}</span>
                  </p>
                )}

                {detail.flavorText && (
                  <p className="border-l-2 border-slate-700 pl-3 text-sm italic leading-relaxed text-slate-400">
                    {detail.flavorText}
                  </p>
                )}

                {/* Habilidades */}
                {detail.abilities && detail.abilities.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Habilidades
                    </h3>
                    <div className="space-y-2">
                      {detail.abilities.map((a, i) => (
                        <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <p className="text-sm font-semibold text-slate-200">
                            {a.name}
                            {a.type && (
                              <span className="ml-1.5 text-xs font-normal text-slate-500">{a.type}</span>
                            )}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-400">{a.text}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Ataques */}
                {detail.attacks && detail.attacks.length > 0 && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Ataques
                    </h3>
                    <div className="space-y-2">
                      {detail.attacks.map((atk, i) => (
                        <div key={i} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <div className="flex items-center gap-1">
                              {atk.cost && atk.cost.length > 0 ? (
                                atk.cost.map((c, j) => <TypeIcon key={j} type={c} />)
                              ) : (
                                <span className="text-xs text-slate-600">Sin costo</span>
                              )}
                            </div>
                            <p className="min-w-0 flex-1 text-sm font-semibold text-slate-200">{atk.name}</p>
                            {atk.damage && (
                              <span className="text-sm font-bold text-white">{atk.damage}</span>
                            )}
                          </div>
                          {atk.text && (
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{atk.text}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Debilidad / Resistencia / Retirada */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <StatBox label="Debilidad" values={detail.weaknesses} empty="Ninguna" />
                  <StatBox label="Resistencia" values={detail.resistances} empty="Ninguna" />
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Retirada</p>
                    {detail.retreatCost && detail.retreatCost.length > 0 ? (
                      <div className="mt-1.5 flex gap-1">
                        {detail.retreatCost.map((c, i) => (
                          <TypeIcon key={i} type={c} small />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-600">Gratis</p>
                    )}
                  </div>
                </div>

                {/* Pie: datos varios */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {detail.artist && <span>Ilustrador: {detail.artist}</span>}
                  {detail.nationalPokedexNumbers && detail.nationalPokedexNumbers.length > 0 && (
                    <span>Pokédex: n.º {detail.nationalPokedexNumbers.join(', ')}</span>
                  )}
                  {detail.legalities && (
                    <span>
                      Legal:{' '}
                      {Object.entries(detail.legalities)
                        .filter(([, v]) => v === 'Legal')
                        .map(([k]) => LEGAL_ES[k] ?? k)
                        .join(', ') || '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
