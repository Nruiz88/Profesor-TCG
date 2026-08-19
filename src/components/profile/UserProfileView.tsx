'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import MarketCard from '@/components/MarketCard'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { REVIEW_TAGS } from '@/lib/reputation'
import { pokedexLevel } from '@/lib/pokedex'
import type { TrainerScore } from '@/lib/trainer'
import TrainerScoreCard from './TrainerScoreCard'
import TrainerCredentialCard from './TrainerCredentialCard'
import PortfolioValueCard from './PortfolioValueCard'
import ShowroomCards from './ShowroomCards'
import FollowButton from './FollowButton'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon, CheckIcon, ShareIcon, SparklesIcon } from '@/components/icons'
import type { ExploreCard } from '@/app/api/public/explore/route'
import type { WantlistCard } from '@/types/wantlist'

export interface ProfileReview {
  id: string
  rating: number
  tags: string[]
  comment: string | null
  createdAt: string
  kind?: string | null
  reviewer: { id: string; username: string } | null
}

export interface ProfileInfo {
  id: string
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
  favorite_energy?: string | null
  isVerified: boolean
  created_at?: string
}

// La sección de configuración (edición + cambio de contraseña) se carga solo
// cuando el dueño del perfil abre su pestaña: bundle aparte, carga inicial
// más liviana.
const ProfileSettingsSection = dynamic(
  () => import('./ProfileSettingsSection'),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm text-slate-500">Cargando configuración…</p>
    )
  }
)

export interface SetCollection {
  setId: string
  setName: string
  series: string
  owned: number
  total: number
  percentage: number
}

interface UserProfileViewProps {
  profile: ProfileInfo
  ratingAvg: number | null
  reviewCount: number
  completedClaims: number
  saleCards: ExploreCard[]
  wantlist: WantlistCard[]
  reviews: ProfileReview[]
  matchCount: number
  isOwnProfile: boolean
  /** Especies Pokémon capturadas en los binders + total del catálogo */
  pokedex?: { captured: number; total: number } | null
  /** Puntos de Entrenador (XP + rango) calculados server-side */
  trainerScore?: TrainerScore
  /** Colección agrupada por set (para la pestaña Colección) */
  collectionBySet?: SetCollection[]
  /** Showcase: cartas más valiosas del binder */
  showcaseCards?: ExploreCard[]
  /** Valor estimado del portafolio (suma de todas las cartas) */
  portfolioValue?: number
  /** Cantidad de seguidores del usuario del perfil */
  followerCount?: number
  /** Cantidad de usuarios a los que sigue */
  followingCount?: number
  /** Si el visitante autenticado ya sigue a este perfil */
  viewerFollows?: boolean
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex text-sm text-amber-400" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? '' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}

// Fecha relativa ("hace 3 días") con la fecha exacta disponible como tooltip.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`
  return `hace ${Math.floor(months / 12)} año${Math.floor(months / 12) !== 1 ? 's' : ''}`
}

const KIND_LABEL: Record<string, string> = {
  sale: '🛒 Compra',
  trade: '🔄 Intercambio',
  both: '🔄 Venta e intercambio'
}

function EmptyState({
  icon,
  title,
  description
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 px-6 py-16 text-center backdrop-blur-xl">
      <p className="text-3xl">{icon}</p>
      <p className="mt-3 text-lg font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

export default function UserProfileView({
  profile,
  ratingAvg,
  reviewCount,
  completedClaims,
  saleCards,
  wantlist,
  reviews,
  matchCount,
  isOwnProfile,
  pokedex,
  trainerScore,
  collectionBySet = [],
  showcaseCards = [],
  portfolioValue = 0,
  followerCount = 0,
  followingCount = 0,
  viewerFollows = false
}: UserProfileViewProps) {
  const [copied, setCopied] = useState(false)
  const [viewer, setViewer] = useState<{
    username?: string
    slotByCardId: Record<string, string>
  } | null>(null)

  const location = formatLocation(profile.city, profile.country)
  const memberSince = profile.created_at ? formatDate(profile.created_at) : null

  // Deep links "¡Yo la tengo!": la sesión del visitante permite apuntar al
  // slot exacto de su binder dentro del mensaje de WhatsApp.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user || cancelled) return

        const [profileRes, binderRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/binder?all=1')
        ])
        const profileData = await profileRes.json()
        const binderData = await binderRes.json()
        if (cancelled) return

        const username = profileRes.ok ? profileData.profile?.username : undefined
        const slotByCardId: Record<string, string> = {}
        for (const c of binderData.cards || []) {
          if (!slotByCardId[c.card_id]) slotByCardId[c.card_id] = c.id
        }
        setViewer({ username, slotByCardId })
      } catch {
        // visitante sin sesión: la wantlist se ve sin botón de oferta
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function buildOfferUrl(w: WantlistCard): string | null {
    if (!viewer || !profile.whatsapp_number) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = viewer.username
      ? `${origin}/binder/${encodeURIComponent(viewer.username)}`
      : `${origin}/binder`
    const slotUrl = viewer.slotByCardId[w.card_id]
      ? `${base}?card=${viewer.slotByCardId[w.card_id]}`
      : base
    return buildSwapOfferUrl({
      sellerUsername: profile.username,
      sellerPhone: profile.whatsapp_number,
      cardName: w.card_name,
      setName: w.set_name || w.set_id,
      cardNumber: w.number,
      slotUrl
    })
  }

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copiá el link del perfil:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Compartir el binder de buscadas del perfil: link que aterriza en la
  // pestaña wantlist (su preview OG ya muestra cuántas cartas busca).
  async function handleShareWantlist() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}/profile/${encodeURIComponent(profile.username)}?tab=wantlist`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copiá el link de buscadas:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        {/* ═══════════ 1. HEADER DEL PERFIL (Banner Superior) ═══════════ */}
        <header className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ffcc]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#00ffcc]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,255,204,0.04)_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Izquierda: subtítulo + nombre + badges */}
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ffcc]">
                — Perfil Maestro Pokémon
              </p>
              <h1 className="mt-2 truncate text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {profile.username}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00ffcc]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00ffcc] shadow-[0_0_6px_rgba(0,255,204,0.9)]" />
                  Coleccionista
                </span>
                {profile.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                    ⚡ Verificado
                  </span>
                )}
                {ratingAvg != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    ★ {ratingAvg.toFixed(1)} · {reviewCount}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300">
                  🤝 {completedClaims} tratos
                </span>
              </div>
            </div>

            {/* Derecha: datos rápidos + acciones */}
            <div className="flex flex-col items-start gap-5 lg:items-end">
              <dl className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                <div className="flex items-center justify-between gap-6">
                  <dt>Energía Favorita</dt>
                  <dd className="font-bold text-slate-200">
                    {profile.favorite_energy ?? '—'}
                  </dd>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-6">
                  <dt>País</dt>
                  <dd className="font-bold text-white">/ {profile.country ?? '—'}</dd>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-6">
                  <dt>Ciudad</dt>
                  <dd className="font-bold text-white">/ {profile.city ?? '—'}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-3">
                <FollowButton
                  username={profile.username}
                  initialFollowing={viewerFollows}
                  initialFollowers={followerCount}
                  isOwnProfile={isOwnProfile}
                />
                {profile.whatsapp_number ? (
                  <a
                    href={whatsAppLink(profile.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
                  >
                    <ChatIcon width={16} height={16} />
                    Enviar WhatsApp
                  </a>
                ) : null}
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:-translate-y-0.5 hover:bg-slate-700"
                >
                  <ShareIcon width={16} height={16} />
                  Compartir Perfil
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Banner de matchmaking: el visitante tiene cartas que este perfil busca */}
        {matchCount > 0 && !isOwnProfile && (
          <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-fuchsia-500/60 bg-fuchsia-500/10 px-5 py-4 shadow-[0_0_25px_rgba(217,70,239,0.25)] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-fuchsia-100">
              🎯 ¡Oportunidad de Match! Tenés{' '}
              <strong>
                {matchCount} carta{matchCount !== 1 ? 's' : ''}
              </strong>{' '}
              que <strong>@{profile.username}</strong> busca en su Wantlist.
            </p>
            <button
              onClick={() => {
                document
                  .getElementById('seccion-buscadas')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-fuchsia-600"
            >
              Ofrecer Swap
            </button>
          </div>
        )}

        {/* ═══════════ 2. SECCIÓN PRINCIPAL (vertical estricto) ═══════════ */}
        <section className="mb-8 flex flex-col gap-6">
          {/* a) Tarjeta de presentación / ID */}
          <TrainerCredentialCard
            username={profile.username}
            city={profile.city}
            country={profile.country}
            isVerified={profile.isVerified}
            rank={trainerScore?.rank ?? null}
          />

          {/* b) Valor Estimado del Portafolio */}
          <PortfolioValueCard value={portfolioValue} />

          {/* c) Mis Cartas Destacadas / Showroom */}
          <ShowroomCards cards={showcaseCards} />
        </section>

        {/* Extras: Pokédex + Puntos de Entrenador */}
        {pokedex && pokedex.total > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-400/25 text-xl ring-1 ring-rose-400/30">
                  ⚡
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Pokédex capturada</p>
                  <p className="text-xs text-slate-400">
                    {pokedex.captured} de {pokedex.total} Pokémon en sus binders
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300">
                {pokedexLevel(pokedex.captured).icon} {pokedexLevel(pokedex.captured).name}
              </span>
            </div>
            <div
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={pokedex.total}
              aria-valuenow={pokedex.captured}
              aria-label="Pokémon capturados"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (pokedex.captured / pokedex.total) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {trainerScore && <TrainerScoreCard score={trainerScore} />}

        {/* ═══════════ 3. SECCIÓN INFERIOR (bloques apilados verticales) ═══════════ */}
        <div className="space-y-12 border-t border-slate-800/70 pt-10">
          {/* 3.1 CARTAS QUE NECESITO & CARTAS EN VENTA */}
          <section>
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              {/* Cartas que necesito */}
              <div id="seccion-buscadas">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-[#00ffcc]">
                    <SparklesIcon width={13} height={13} />
                    — Cartas que necesito
                  </span>
                  {wantlist.length > 0 && (
                    <button
                      type="button"
                      onClick={handleShareWantlist}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-3 py-1.5 text-xs font-semibold text-[#00ffcc] transition-colors hover:bg-[#00ffcc]/20"
                    >
                      <ShareIcon className="h-4 w-4" />
                      Compartir buscadas
                    </button>
                  )}
                </div>
                {wantlist.length === 0 ? (
                  <EmptyState
                    icon="✨"
                    title="Wantlist vacía"
                    description={`@${profile.username} todavía no agregó cartas a su lista de buscadas.`}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {wantlist.map((w) => (
                      <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
                    ))}
                  </div>
                )}
              </div>

              {/* Cartas en venta / trade */}
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-rose-300">
                    — Cartas en venta
                  </span>
                  <Link
                    href="/explore"
                    className="text-xs font-semibold text-rose-300 underline-offset-4 transition-colors hover:text-rose-200 hover:underline"
                  >
                    Ver el mercado completo →
                  </Link>
                </div>
                {saleCards.length === 0 ? (
                  <EmptyState
                    icon="🛍️"
                    title="Sin publicaciones activas"
                    description={`@${profile.username} todavía no tiene cartas en venta o intercambio.`}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {saleCards.map((card) => (
                      <MarketCard key={card.id} card={card} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3.2 COLECCIÓN (Master Sets) */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-cyan-300">
                📦 — Colección / Master Sets
              </span>
            </div>
            {collectionBySet.length === 0 ? (
              <EmptyState
                icon="📦"
                title="Sin colección"
                description={`@${profile.username} todavía no tiene cartas en su binder.`}
              />
            ) : (
              <div>
                {/* Stats resumen */}
                {(() => {
                  const totalOwned = collectionBySet.reduce((s, c) => s + c.owned, 0)
                  const totalAll = collectionBySet.reduce((s, c) => s + c.total, 0)
                  const avgPct = totalAll > 0 ? Math.round((totalOwned / totalAll) * 100) : 0
                  const completedSets = collectionBySet.filter((c) => c.percentage >= 100).length
                  return (
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                        <p className="text-2xl font-extrabold text-white">{collectionBySet.length}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Sets</p>
                      </div>
                      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                        <p className="text-2xl font-extrabold text-white">{totalOwned.toLocaleString()}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cartas</p>
                      </div>
                      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                        <p className="text-2xl font-extrabold text-sky-400">~{avgPct}%</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Promedio</p>
                      </div>
                      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                        <p className="text-2xl font-extrabold text-emerald-400">{completedSets}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Completados</p>
                      </div>
                    </div>
                  )
                })()}

                {/* Sets agrupados por serie */}
                {(() => {
                  const grouped = new Map<string, typeof collectionBySet>()
                  for (const sc of collectionBySet) {
                    const key = sc.series || 'Otros'
                    if (!grouped.has(key)) grouped.set(key, [])
                    grouped.get(key)!.push(sc)
                  }
                  const sortedSeries = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)

                  return sortedSeries.map(([seriesName, sets]) => {
                    const seriesOwned = sets.reduce((s, c) => s + c.owned, 0)
                    const seriesTotal = sets.reduce((s, c) => s + c.total, 0)
                    const seriesPct = seriesTotal > 0 ? Math.round((seriesOwned / seriesTotal) * 100) : 0
                    return (
                      <div key={seriesName} className="mb-6">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white">{seriesName}</h3>
                          <span className="text-[10px] font-medium text-slate-500">
                            {sets.length} set{sets.length !== 1 ? 's' : ''} · {seriesOwned} cartas · ~{seriesPct}%
                          </span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {sets.map((sc) => (
                            <div
                              key={sc.setId}
                              className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-xl transition-colors hover:border-cyan-400/30"
                            >
                              <div className="flex items-start gap-3">
                                <SetLogo setId={sc.setId} name={sc.setName} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 truncate text-sm font-bold text-white">{sc.setName}</p>
                                    <span
                                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                                        sc.percentage >= 100
                                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                          : sc.percentage >= 50
                                            ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                                            : sc.percentage >= 20
                                              ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                                              : 'bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/30'
                                      }`}
                                    >
                                      {sc.percentage}%
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                      <span>{sc.owned} de {sc.total}</span>
                                      <span>{sc.percentage}%</span>
                                    </div>
                                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          sc.percentage >= 100
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            : sc.percentage >= 50
                                              ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                                              : sc.percentage >= 20
                                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                : 'bg-gradient-to-r from-slate-600 to-slate-500'
                                        }`}
                                        style={{ width: `${sc.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </section>

          {/* 3.3 RESEÑAS */}
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-amber-300">
                ⭐ — Reseñas
              </span>
            </div>
            {reviews.length === 0 ? (
              <EmptyState
                icon="⭐"
                title="Sin reseñas todavía"
                description={`Cuando @${profile.username} complete transacciones, sus compradores van a poder dejar su opinión acá.`}
              />
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const tagLabels = review.tags
                    .map((t) => REVIEW_TAGS.find((rt) => rt.id === t)?.label)
                    .filter((l): l is string => !!l)
                  return (
                    <article
                      key={review.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl transition-colors hover:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-sm font-bold text-white shadow">
                          {(review.reviewer?.username[0] ?? '?').toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          {review.reviewer ? (
                            <p className="truncate text-sm">
                              <Link
                                href={`/profile/${encodeURIComponent(review.reviewer.username)}`}
                                className="font-semibold text-white transition-colors hover:text-rose-300"
                              >
                                @{review.reviewer.username}
                              </Link>{' '}
                              <span className="text-slate-500">dejó una reseña</span>
                            </p>
                          ) : (
                            <p className="truncate text-sm">
                              <span className="font-semibold text-white">Un comprador</span>{' '}
                              <span className="text-slate-500">dejó una reseña</span>
                            </p>
                          )}
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {review.kind && KIND_LABEL[review.kind] && (
                              <span className="rounded-full border border-slate-700 bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                                {KIND_LABEL[review.kind]}
                              </span>
                            )}
                            <time
                              dateTime={review.createdAt}
                              title={formatDate(review.createdAt)}
                              className="text-xs text-slate-500"
                            >
                              {timeAgo(review.createdAt)}
                            </time>
                          </p>
                        </div>
                        <Stars rating={review.rating} />
                      </div>

                      {review.comment && (
                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                          {review.comment}
                        </p>
                      )}

                      {tagLabels.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {tagLabels.map((label) => (
                            <span
                              key={label}
                              className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[10px] font-medium text-slate-300"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* 3.4 CONFIGURACIÓN (solo perfil propio) */}
          {isOwnProfile && (
            <section>
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-500/40 bg-slate-500/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-slate-200">
                  ⚙️ — Configuración
                </span>
              </div>
              <ProfileSettingsSection profile={profile} />
            </section>
          )}

          {/* Toast de feedback al compartir */}
          {copied && (
            <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-2xl">
              <CheckIcon width={16} height={16} />
              Link del perfil copiado
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Iniciales para el placeholder temático cuando el logo del set no carga
function setInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// @ts-ignore — Next.js resuelve JSON imports en build time
import manifestData from '../../content/image-manifest.json'
const setManifest: Record<string, string> = manifestData as Record<string, string>

// Candidatos de URL de logo según la fuente primaria del set (del manifest).
// Mejora sobre usar solo pokemontcg.io: muchos sets (ej. me5 "Pitch Black",
// sets JA) solo tienen logo en Scrydex.
function logoCandidates(setId: string): string[] {
  const source = setManifest[setId]
  const pokemontcg = `https://images.pokemontcg.io/${setId}/logo.png`
  const scrydex = `https://images.scrydex.com/pokemon/${setId}/logo`
  switch (source) {
    case 'scrydex':
    case 'scrydex-unpadded':
      return [scrydex, pokemontcg]
    case 'pokemontcg':
      return [pokemontcg, scrydex]
    case 'tcgdex':
    case 'none':
    default:
      return [pokemontcg, scrydex]
  }
}

// Logo del set con fallback encadenado: recorre los candidatos de URL según la
// fuente del set y, si ninguno carga, muestra un placeholder temático con las
// iniciales en vez de dejar un fondo vacío que parece el reverso de una carta.
function SetLogo({ setId, name }: { setId: string; name: string }) {
  const candidates = logoCandidates(setId)
  const [index, setIndex] = useState(0)
  const failedAll = index >= candidates.length

  if (failedAll) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
        <span className="px-1 text-[11px] font-bold tracking-tight text-slate-300">
          {setInitials(name) || setId.toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
      <img
        src={candidates[index]}
        alt={`Logo de ${name}`}
        className="h-full w-full object-contain p-0.5"
        loading="lazy"
        onError={() => setIndex((i) => i + 1)}
      />
    </div>
  )
}