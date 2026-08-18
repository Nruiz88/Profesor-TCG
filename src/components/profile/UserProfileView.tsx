'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SiteNav from '@/components/SiteNav'
import MarketCard from '@/components/MarketCard'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { REVIEW_TAGS } from '@/lib/reputation'
import { pokedexLevel } from '@/lib/pokedex'
import type { TrainerScore } from '@/lib/trainer'
import TrainerScoreCard from './TrainerScoreCard'
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
  isVerified: boolean
  created_at?: string
}

type ProfileTab = 'sale' | 'wantlist' | 'reviews' | 'settings'

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
  trainerScore
}: UserProfileViewProps) {
  // Tab inicial desde la URL (?tab=settings) para que "Configurar perfil"
  // aterrice directo en la configuración del perfil propio.
  const [tab, setTab] = useState<ProfileTab>(() => {
    if (typeof window === 'undefined') return 'sale'
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'settings' && isOwnProfile) return 'settings'
    if (t === 'wantlist') return 'wantlist'
    return 'sale'
  })
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

  const initial = (profile.username[0] ?? '?').toUpperCase()

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <SiteNav />

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header de identidad y reputación */}
        <header className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
          {/* Acentos neón superior e inferior */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
          {/* Glows decorativos de fondo */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          {/* Patrón sutil de cuadrícula */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Identidad */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500/50 via-rose-500/40 to-sky-500/40 text-4xl font-black text-white ring-2 ring-fuchsia-400/60 shadow-[0_0_45px_rgba(217,70,239,0.4)]">
                  {initial}
                </div>
                {profile.isVerified && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm text-white shadow-lg shadow-emerald-900/50 ring-2 ring-slate-900"
                    title="Verificado"
                  >
                    ⚡
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate bg-gradient-to-r from-white via-rose-100 to-fuchsia-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                    {profile.username}
                  </h1>
                  {profile.isVerified && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-300 ring-1 ring-emerald-500/30">
                      ⚡ Verificado
                    </span>
                  )}
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-400">
                  <span className="font-mono text-slate-500">@{profile.username}</span>
                  {location && (
                    <>
                      <span className="text-slate-700">•</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/70 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        📍 {location}
                      </span>
                    </>
                  )}
                  {memberSince && (
                    <>
                      <span className="text-slate-700">•</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                        🗓️ Miembro desde {memberSince}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Reputación + acciones */}
            <div className="flex flex-col gap-4 lg:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {ratingAvg != null ? (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-slate-950/70 px-3 py-2">
                    <span className="text-base">⭐</span>
                    <span className="text-sm font-bold text-amber-400">{ratingAvg.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">
                      {reviewCount} reseña{reviewCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-500">
                    ⭐ Sin reseñas aún
                  </div>
                )}
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-slate-950/70 px-3 py-2">
                  <span className="text-base">🤝</span>
                  <span className="text-sm font-bold text-emerald-300">{completedClaims}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/70">
                    tratos
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
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

        {/* Pokédex: especies Pokémon capturadas en los binders (cosmético) */}
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

        {/* Puntos de Entrenador: XP unificada por actividad (cosmético) */}
        {trainerScore && <TrainerScoreCard score={trainerScore} />}

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
              onClick={() => setTab('wantlist')}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-fuchsia-600"
            >
              Ofrecer Swap
            </button>
          </div>
        )}

        {/* Control de pestañas */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            {
              id: 'sale' as const,
              icon: '🛍️',
              label: 'En Venta / Trade',
              count: saleCards.length,
              activeClass: 'from-rose-500 to-orange-500'
            },
            {
              id: 'wantlist' as const,
              icon: '✨',
              label: 'Cartas Buscadas',
              count: wantlist.length,
              activeClass: 'from-fuchsia-600 to-violet-500'
            },
            {
              id: 'reviews' as const,
              icon: '⭐',
              label: 'Reseñas',
              count: reviews.length,
              activeClass: 'from-amber-500 to-yellow-500'
            }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.id
                  ? `bg-gradient-to-r ${t.activeClass} text-white shadow-lg shadow-black/40`
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  tab === t.id ? 'bg-white/25 text-white' : 'bg-white/10 text-slate-400'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setTab('settings')}
              aria-pressed={tab === 'settings'}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                tab === 'settings'
                  ? 'bg-gradient-to-r from-slate-600 to-slate-500 text-white shadow-lg shadow-black/40'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              <span>⚙️</span>
              Configuración
            </button>
          )}
        </div>

        {/* Contenido de la pestaña activa */}
        {tab === 'sale' &&
          (saleCards.length === 0 ? (
            <EmptyState
              icon="🛍️"
              title="Sin publicaciones activas"
              description={`@${profile.username} todavía no tiene cartas en venta o intercambio.`}
            />
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
                  </span>
                  {saleCards.length} carta{saleCards.length !== 1 ? 's' : ''} disponible
                  {saleCards.length !== 1 ? 's' : ''} para vender o intercambiar
                </p>
                <Link
                  href="/explore"
                  className="text-xs font-semibold text-rose-300 underline-offset-4 transition-colors hover:text-rose-200 hover:underline"
                >
                  Ver el mercado completo →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {saleCards.map((card) => (
                  <MarketCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          ))}

        {tab === 'wantlist' &&
          (wantlist.length === 0 ? (
            <EmptyState
              icon="✨"
              title="Wantlist vacía"
              description={`@${profile.username} todavía no agregó cartas a su lista de buscadas.`}
            />
          ) : (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-300">
                  <SparklesIcon width={13} height={13} />
                  @{profile.username} busca {wantlist.length} carta
                  {wantlist.length !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={handleShareWantlist}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
                >
                  <ShareIcon className="h-4 w-4" />
                  Compartir buscadas
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {wantlist.map((w) => (
                  <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
                ))}
              </div>
            </div>
          ))}

        {tab === 'settings' && <ProfileSettingsSection profile={profile} />}

        {tab === 'reviews' &&
          (reviews.length === 0 ? (
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
          ))}

        {/* Toast de feedback al compartir */}
        {copied && (
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-900 px-4 py-3 text-sm font-semibold text-emerald-300 shadow-2xl">
            <CheckIcon width={16} height={16} />
            Link del perfil copiado
          </div>
        )}
      </div>
    </div>
  )
}
