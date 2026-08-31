'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { whatsAppLink } from '@/lib/profile'
import type { TrainerScore } from '@/lib/trainer'
import TrainerScoreCard from './TrainerScoreCard'
import TrainerXpCard from './TrainerXpCard'
import ProfilePokedexCard from './ProfilePokedexCard'
import ProfileSaleSection from './ProfileSaleSection'
import ProfileWantlistSection from './ProfileWantlistSection'
import ProfileCollectionSection from './ProfileCollectionSection'
import ProfileReviewsSection from './ProfileReviewsSection'
import ShowroomCards from './ShowroomCards'
import FollowButton from './FollowButton'
import { createClient } from '@/lib/supabase/client'
import { ChatIcon, CheckIcon, ShareIcon } from '@/components/icons'
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
                      <div className="mt-5">
                        <TrainerXpCard score={trainerScore} />
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
                <ProfileSaleSection cards={saleCards} />

                {/* Buscadas */}
                <div
                  id="seccion-buscadas"
                  className="relative"
                >
                  <div className="mb-3 flex items-center justify-end">
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
                  <ProfileWantlistSection entries={wantlist} offerUrlFor={buildOfferUrl} />
                </div>

                {/* Colección */}
                <ProfileCollectionSection
                  sets={collectionBySet}
                  totalCardCount={totalCardCount}
                  setLogos={setLogos}
                  wantedBySet={wantedBySet}
                />
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
                <ProfilePokedexCard captured={pokedex.captured} total={pokedex.total} />
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
              <TrainerXpCard score={trainerScore} compact />
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
          <ProfileSaleSection cards={saleCards} />

          {/* Buscadas */}
          <section
            id="seccion-buscadas"
          >
            <div className="mb-4 flex items-center justify-end">
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
            <ProfileWantlistSection entries={wantlist} offerUrlFor={buildOfferUrl} />
          </section>

          {/* Colección */}
          <ProfileCollectionSection
            sets={collectionBySet}
            totalCardCount={totalCardCount}
            setLogos={setLogos}
            wantedBySet={wantedBySet}
          />

          {/* Pokédex */}
          {pokedex && pokedex.total > 0 && (
            <ProfilePokedexCard captured={pokedex.captured} total={pokedex.total} />
          )}

          {/* Reseñas */}
          <ProfileReviewsSection username={profile.username} reviews={reviews} />

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