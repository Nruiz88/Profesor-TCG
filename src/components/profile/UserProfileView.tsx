'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MarketCard from '@/components/MarketCard'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { whatsAppLink } from '@/lib/profile'
import { REVIEW_TAGS } from '@/lib/reputation'
import { pokedexLevel } from '@/lib/pokedex'
import type { TrainerScore } from '@/lib/trainer'
import TrainerScoreCard from './TrainerScoreCard'
import ShowroomCards from './ShowroomCards'
import FollowButton from './FollowButton'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon, CheckIcon, ShareIcon } from '@/components/icons'
import type { ExploreCard } from '@/app/api/public/explore/route'
import type { WantlistCard } from '@/types/wantlist'
import SetCollectionCard from './SetCollectionCard'

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

// Total de cartas únicas del usuario (para el contador destacado)
function countUniqueCards(saleCards: ExploreCard[], wantlist: WantlistCard[], showcaseCards: ExploreCard[]): number {
  const ids = new Set<string>()
  for (const c of saleCards) ids.add(c.card_id)
  for (const c of wantlist) ids.add(c.card_id)
  for (const c of showcaseCards) ids.add(c.card_id)
  return ids.size
}

// ── NUEVA DISTRIBUCIÓN (desktop): secciones apiladas sin tabs ─────────
// Hero (identidad + XP) · Cartas Destacadas · Mi Inventario (En Venta,
// Buscadas, Colección) · Sidebar (acciones + progreso + café).

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
  followerCount = 0,
  followingCount = 0,
  viewerFollows = false
}: UserProfileViewProps) {
  const [copied, setCopied] = useState(false)
  const [viewer, setViewer] = useState<{
    username?: string
    slotByCardId: Record<string, string>
  } | null>(null)

  const totalCardCount = collectionBySet.reduce((s, c) => s + c.owned, 0) || countUniqueCards(saleCards, wantlist, showcaseCards)

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

  const initial = (profile.username[0] ?? '?').toUpperCase()

  // Datos para el header de stats (desktop y mobile)
  const statsRows = [
    { label: 'Energía', value: profile.favorite_energy ?? '—' },
    { label: 'País', value: profile.country ?? '—' },
    { label: 'Ciudad', value: profile.city ?? '—' },
    { label: '🃏 Cartas', value: totalCardCount.toLocaleString(), accent: true }
  ]

  // Orden de los sets para el sidebar de progreso (ya vienen ordenados)
  const avgPct =
    collectionBySet.length > 0
      ? Math.round(
          (collectionBySet.reduce((s, c) => s + c.owned, 0) /
            Math.max(1, collectionBySet.reduce((s, c) => s + c.total, 0))) *
            100
        )
      : 0

  // Wantlist agrupada por set_id (para enlazar deseos a cada set)
  const wantedBySet = new Map<string, WantlistCard[]>()
  for (const w of wantlist) {
    if (!wantedBySet.has(w.set_id)) wantedBySet.set(w.set_id, [])
    wantedBySet.get(w.set_id)!.push(w)
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      {/* ═══════════ DESKTOP: nueva distribución ═══════════ */}
      <div className="hidden lg:block">
        <div className="mx-auto w-full max-w-[1600px] px-10 py-8">
          {/* Header compacto con acciones */}
          <header className="mb-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00ffcc]/40 bg-gradient-to-tr from-[#00ffcc]/25 to-rose-500/25 text-2xl font-black text-white shadow-[0_0_25px_rgba(0,255,204,0.3)]">
                  {initial}
                </div>
                {profile.isVerified && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ffcc] text-xs font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.6)]">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-3xl font-extrabold tracking-tight text-white">
                    {profile.username}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00ffcc]">
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
                <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-400">
                  {profile.city ? (
                    <>
                      <span>{profile.city}</span>
                      {profile.country && <span className="text-slate-600">·</span>}
                      <span>{profile.country}</span>
                    </>
                  ) : profile.country ? (
                    <span>{profile.country}</span>
                  ) : (
                    <span className="text-slate-600">Ubicación no publicada</span>
                  )}
                  <span className="text-slate-600">·</span>
                  <span>{completedClaims} trato{completedClaims !== 1 ? 's' : ''}</span>
                  <span className="text-slate-600">·</span>
                  <span>{followerCount} seguidor{followerCount !== 1 ? 'es' : ''}</span>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
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
                  WhatsApp
                </a>
              ) : null}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-xl border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-4 py-2.5 text-sm font-semibold text-[#00ffcc] transition-all hover:-translate-y-0.5 hover:bg-[#00ffcc]/20"
              >
                <ShareIcon width={16} height={16} />
                {copied ? '✓ Copiado' : 'Compartir'}
              </button>
            </div>
          </header>

          {/* Grid principal: 2 cols contenido + 1 col sidebar */}
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            {/* ─── Columna principal (2) ─── */}
            <div className="space-y-10 xl:col-span-2">
              {/* Hero: identidad + XP del entrenador */}
              <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ffcc]/70 to-transparent" />
                <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#00ffcc]/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-rose-500/10 blur-3xl" />

                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center">
                  {/* Avatar ring con órbitas */}
                  <div className="relative shrink-0">
                    <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-800 bg-gradient-to-tr from-[#00ffcc]/25 via-violet-500/20 to-rose-500/25 text-5xl font-black text-white shadow-[0_0_30px_rgba(0,255,204,0.35)]">
                      {initial}
                    </div>
                    <div className="absolute -inset-2 rounded-full border border-[#00ffcc]/30" />
                    <div className="absolute -inset-4 rounded-full border border-dashed border-rose-500/30" />
                    {profile.isVerified && (
                      <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#00ffcc] text-lg font-bold text-[#080c15] shadow-[0_0_18px_rgba(0,255,204,0.7)] ring-4 ring-[#090d16]">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Info + progreso entrenador inline */}
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ffcc]">
                      — Perfil Maestro Pokémon
                    </p>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
                      {profile.username}
                    </h2>

                    {trainerScore && (
                      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Rango actual
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-amber-300">
                              <span className="text-xl">{trainerScore.rank.icon}</span>
                              {trainerScore.rank.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              Total XP
                            </p>
                            <p className="mt-0.5 text-lg font-bold text-white">
                              {trainerScore.xp.toLocaleString('en-US')} XP
                            </p>
                          </div>
                        </div>
                        {trainerScore.nextRank && (
                          <>
                            <div
                              className="mt-3 h-3 w-full overflow-hidden rounded-full border border-slate-700/50 bg-slate-900"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(trainerScore.progress * 100)}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_12px_rgba(241,193,0,0.5)]"
                                style={{ width: `${Math.round(trainerScore.progress * 100)}%` }}
                              />
                            </div>
                            <p className="mt-1.5 text-right font-mono text-[10px] text-slate-500">
                              Siguiente rango: {trainerScore.nextRank.icon} {trainerScore.nextRank.name}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Matchmaking banner */}
              {matchCount > 0 && !isOwnProfile && (
                <div className="flex flex-col gap-4 rounded-2xl border border-fuchsia-500/60 bg-fuchsia-500/10 px-5 py-4 shadow-[0_0_25px_rgba(217,70,239,0.25)] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-relaxed text-fuchsia-100">
                    🎯 ¡Oportunidad de Match! Tenés{' '}
                    <strong>
                      {matchCount} carta{matchCount !== 1 ? 's' : ''}
                    </strong>{' '}
                    que <strong>@{profile.username}</strong> busca en su Wantlist.
                  </p>
                  <a
                    href="#seccion-buscadas"
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-fuchsia-600"
                  >
                    Ofrecer Swap
                  </a>
                </div>
              )}

              {/* Cartas Destacadas */}
              <section>
                <div className="mb-5 flex items-end justify-between border-b border-slate-800/60 pb-4">
                  <h3 className="flex items-center gap-2.5 text-xl font-bold text-white">
                    <span className="text-2xl drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">★</span>
                    Cartas Destacadas
                  </h3>
                  <Link
                    href={`/binder/${encodeURIComponent(profile.username)}`}
                    className="group flex items-center gap-1 text-sm font-semibold text-[#00ffcc] transition-colors hover:text-[#00ffcc]/80"
                  >
                    Ver binder
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
                <ShowroomCards cards={showcaseCards} />
              </section>

              {/* Mi Inventario */}
              <section className="space-y-10">
                {/* En Venta */}
                <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-[#00ffcc]/40 bg-slate-900/40 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex items-center gap-3">
                    <h4 className="text-lg font-bold text-white">En Venta</h4>
                    <span className="rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#00ffcc]">
                      {saleCards.length} ítem{saleCards.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {saleCards.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No tiene cartas en venta o intercambio todavía.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                      {saleCards.slice(0, 10).map((card) => (
                        <MarketCard key={card.id} card={card} />
                      ))}
                    </div>
                  )}
                  {saleCards.length > 10 && (
                    <Link
                      href="/"
                      className="mt-4 inline-block text-xs font-semibold text-rose-300 underline-offset-4 hover:text-rose-200 hover:underline"
                    >
                      Ver las {saleCards.length} en el mercado →
                    </Link>
                  )}
                </div>

                {/* Buscadas */}
                <div
                  id="seccion-buscadas"
                  className="relative overflow-hidden rounded-2xl border border-slate-800/80 border-t-2 border-t-rose-500/50 bg-slate-900/40 p-6 backdrop-blur-xl"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 text-rose-500/5">
                    <span className="text-[120px]">✨</span>
                  </div>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-rose-300">Buscadas</h4>
                      <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                        {wantlist.length} ítem{wantlist.length !== 1 ? 's' : ''}
                      </span>
                    </div>
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
                    <p className="py-8 text-center text-sm text-slate-500">
                      No agregó cartas a su lista de buscadas todavía.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                      {wantlist.map((w) => (
                        <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Colección */}
                <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-amber-400/40 bg-slate-900/40 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-bold text-white">Colección</h4>
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      {collectionBySet.length} set{collectionBySet.length !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                      {totalCardCount} carta{totalCardCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {collectionBySet.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Todavía no tiene cartas en su binder.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {collectionBySet.slice(0, 8).map((sc) => (
                        <SetCollectionCard
                          key={sc.setId}
                          setId={sc.setId}
                          setName={sc.setName}
                          series={sc.series}
                          owned={sc.owned}
                          total={sc.total}
                          percentage={sc.percentage}
                          logoUrl={setLogos[sc.setId] ?? null}
                          wanted={wantedBySet.get(sc.setId) ?? []}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ─── Sidebar (1) ─── */}
            <div className="space-y-6">
              {/* Acciones rápidas */}
              <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-[#00ffcc]/50 bg-slate-900/40 p-6 backdrop-blur-xl">
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleShare}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ffcc] px-4 py-3 text-sm font-black text-[#080c15] shadow-[0_0_15px_rgba(0,255,204,0.25)] transition-all hover:brightness-110"
                  >
                    <ShareIcon width={17} height={17} />
                    {copied ? '✓ Link copiado' : 'Compartir Perfil'}
                  </button>
                  {profile.whatsapp_number && (
                    <a
                      href={whatsAppLink(profile.whatsapp_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-bold text-slate-200 transition-colors hover:border-emerald-500/50 hover:bg-slate-700"
                    >
                      <ChatIcon className="h-4 w-4 text-[#25D366]" />
                      Contactar WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Pokédex */}
              {pokedex && pokedex.total > 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-400/25 text-xl ring-1 ring-rose-400/30">
                        ⚡
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">Pokédex capturada</p>
                        <p className="text-xs text-slate-400">
                          {pokedex.captured} de {pokedex.total} Pokémon
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
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (pokedex.captured / pokedex.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Progreso por set */}
              {collectionBySet.length > 0 && (
                <div className="rounded-2xl border border-slate-800/80 border-t-2 border-t-rose-500/40 bg-slate-900/40 p-6 backdrop-blur-xl">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-bold text-white">
                      <span className="text-rose-400">📊</span>
                      Progreso General
                    </h3>
                    <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-rose-300">
                      Promedio ~{avgPct}%
                    </span>
                  </div>
                  <div className="space-y-4">
                    {collectionBySet.slice(0, 6).map((sc) => (
                      <div key={sc.setId}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-200">
                            {sc.setName}
                          </p>
                          <p className="font-mono text-xs font-bold text-rose-300">
                            {sc.percentage}%
                          </p>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                          <div
                            className={`h-full rounded-full ${
                              sc.percentage >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : sc.percentage >= 50
                                  ? 'bg-gradient-to-r from-sky-500 to-cyan-400'
                                  : sc.percentage >= 20
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                    : 'bg-gradient-to-r from-rose-600 to-rose-500'
                            }`}
                            style={{ width: `${Math.max(sc.percentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detalle de XP (desglose) */}
              {trainerScore && <TrainerScoreCard score={trainerScore} />}

              {/* Café */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-center backdrop-blur-xl">
                <p className="font-mono text-xs text-slate-400">
                  TCG Claim es 100% gratuito.
                </p>
                <a
                  href="https://ko-fi.com/O6W625B65J"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                >
                  ☕ Invitarnos un café
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MOBILE (< lg): misma distribución apilada ═══════════ */}
      <div className="lg:hidden">
        {/* Header compacto */}
        <header className="relative overflow-hidden border-b border-slate-800/60">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ffcc]/70 to-transparent" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#00ffcc]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative px-4 pb-5 pt-6">
            {/* Fila: avatar + nombre */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00ffcc]/40 bg-gradient-to-tr from-[#00ffcc]/25 to-rose-500/25 text-2xl font-black text-white shadow-[0_0_25px_rgba(0,255,204,0.3)]">
                  {initial}
                </div>
                {profile.isVerified && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ffcc] text-xs font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.6)]">
                    ✓
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#00ffcc]">
                  Perfil Maestro Pokémon
                </p>
                <h1 className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-white">
                  {profile.username}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#00ffcc]">
                    Coleccionista
                  </span>
                  {profile.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                      ⚡ Verificado
                    </span>
                  )}
                  {ratingAvg != null && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
                      ★ {ratingAvg.toFixed(1)} · {reviewCount}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-500"
                >
                  <ChatIcon width={14} height={14} />
                  WhatsApp
                </a>
              ) : null}
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-700"
              >
                <ShareIcon width={14} height={14} />
                {copied ? '✓ Copiado' : 'Compartir'}
              </button>
            </div>

            {/* Stats inline */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800/60 pt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
              {statsRows.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span>{s.label}</span>
                  <span className={`font-bold ${s.accent ? 'text-[#00ffcc]' : 'text-white'}`}>
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="space-y-8 px-4 py-6">
          {/* Hero: XP inline */}
          {trainerScore && (
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Rango actual
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-lg font-bold text-amber-300">
                    <span className="text-xl">{trainerScore.rank.icon}</span>
                    {trainerScore.rank.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Total XP
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-white">
                    {trainerScore.xp.toLocaleString('en-US')} XP
                  </p>
                </div>
              </div>
              {trainerScore.nextRank && (
                <>
                  <div
                    className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-slate-700/50 bg-slate-900"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(trainerScore.progress * 100)}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_12px_rgba(241,193,0,0.5)]"
                      style={{ width: `${Math.round(trainerScore.progress * 100)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-right font-mono text-[10px] text-slate-500">
                    Siguiente rango: {trainerScore.nextRank.icon} {trainerScore.nextRank.name}
                  </p>
                </>
              )}
            </section>
          )}

          {/* Matchmaking */}
          {matchCount > 0 && !isOwnProfile && (
            <div className="rounded-2xl border border-fuchsia-500/60 bg-fuchsia-500/10 px-4 py-4 shadow-[0_0_25px_rgba(217,70,239,0.25)]">
              <p className="text-sm leading-relaxed text-fuchsia-100">
                🎯 ¡Oportunidad de Match! Tenés{' '}
                <strong>
                  {matchCount} carta{matchCount !== 1 ? 's' : ''}
                </strong>{' '}
                que <strong>@{profile.username}</strong> busca en su Wantlist.
              </p>
              <a
                href="#seccion-buscadas"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-fuchsia-600"
              >
                Ofrecer Swap
              </a>
            </div>
          )}

          {/* Cartas Destacadas */}
          <section>
            <div className="mb-4 flex items-end justify-between border-b border-slate-800/60 pb-3">
              <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                <span className="text-xl">★</span>
                Cartas Destacadas
              </h3>
              <Link
                href={`/binder/${encodeURIComponent(profile.username)}`}
                className="text-xs font-semibold text-[#00ffcc]"
              >
                Ver binder →
              </Link>
            </div>
            <ShowroomCards cards={showcaseCards} />
          </section>

          {/* En Venta */}
          <section className="rounded-2xl border border-slate-800/80 border-t-2 border-t-[#00ffcc]/40 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2.5">
              <h4 className="text-lg font-bold text-white">En Venta</h4>
              <span className="rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-2 py-0.5 font-mono text-[10px] font-bold text-[#00ffcc]">
                {saleCards.length} ítem{saleCards.length !== 1 ? 's' : ''}
              </span>
            </div>
            {saleCards.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No tiene cartas en venta o intercambio todavía.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {saleCards.slice(0, 8).map((card) => (
                  <MarketCard key={card.id} card={card} />
                ))}
              </div>
            )}
            {saleCards.length > 8 && (
              <Link
                href="/"
                className="mt-3 inline-block text-xs font-semibold text-rose-300 underline-offset-4 hover:text-rose-200 hover:underline"
              >
                Ver las {saleCards.length} en el mercado →
              </Link>
            )}
          </section>

          {/* Buscadas */}
          <section
            id="seccion-buscadas"
            className="rounded-2xl border border-slate-800/80 border-t-2 border-t-rose-500/50 bg-slate-900/40 p-5 backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <h4 className="text-lg font-bold text-rose-300">Buscadas</h4>
                <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                  {wantlist.length} ítem{wantlist.length !== 1 ? 's' : ''}
                </span>
              </div>
              {wantlist.length > 0 && (
                <button
                  type="button"
                  onClick={handleShareWantlist}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffcc]/40 bg-[#00ffcc]/10 px-3 py-1.5 text-xs font-semibold text-[#00ffcc] transition-colors hover:bg-[#00ffcc]/20"
                >
                  <ShareIcon className="h-4 w-4" />
                  Compartir
                </button>
              )}
            </div>
            {wantlist.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No agregó cartas a su lista de buscadas todavía.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {wantlist.map((w) => (
                  <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
                ))}
              </div>
            )}
          </section>

          {/* Colección */}
          <section className="rounded-2xl border border-slate-800/80 border-t-2 border-t-amber-400/40 bg-slate-900/40 p-5 backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <h4 className="text-lg font-bold text-white">Colección</h4>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                {collectionBySet.length} set{collectionBySet.length !== 1 ? 's' : ''}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                {totalCardCount} carta{totalCardCount !== 1 ? 's' : ''}
              </span>
            </div>
            {collectionBySet.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Todavía no tiene cartas en su binder.
              </p>
            ) : (
              <div className="space-y-3">
                {collectionBySet.slice(0, 10).map((sc) => (
                  <SetCollectionCard
                    key={sc.setId}
                    setId={sc.setId}
                    setName={sc.setName}
                    series={sc.series}
                    owned={sc.owned}
                    total={sc.total}
                    percentage={sc.percentage}
                    logoUrl={setLogos[sc.setId] ?? null}
                    wanted={wantedBySet.get(sc.setId) ?? []}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Pokédex */}
          {pokedex && pokedex.total > 0 && (
            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-400/25 text-xl ring-1 ring-rose-400/30">
                    ⚡
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Pokédex capturada</p>
                    <p className="text-xs text-slate-400">
                      {pokedex.captured} de {pokedex.total} Pokémon
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
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (pokedex.captured / pokedex.total) * 100)}%` }}
                />
              </div>
            </section>
          )}

          {/* Reseñas */}
          <section>
            <div className="mb-4 border-b border-slate-800/60 pb-3">
              <h3 className="text-lg font-bold text-white">⭐ Reseñas</h3>
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

          {/* Café */}
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 text-center backdrop-blur-xl">
            <p className="font-mono text-xs text-slate-400">
              TCG Claim es 100% gratuito.
            </p>
            <a
              href="https://ko-fi.com/O6W625B65J"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              ☕ Invitarnos un café
            </a>
          </section>
        </div>
      </div>

      {/* Toast de feedback al compartir */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-2xl">
          <CheckIcon width={16} height={16} />
          Link del perfil copiado
        </div>
      )}
    </div>
  )
}

// @ts-ignore — Next.js resuelve JSON imports en build time
import setLogosData from '../../content/set-logos.json'
const setLogos: Record<string, string> = setLogosData as Record<string, string>