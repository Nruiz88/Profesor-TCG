'use client'

import { useEffect, useState } from 'react'
import SiteNav from '@/components/SiteNav'
import MarketCard from '@/components/MarketCard'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { formatLocation, whatsAppLink } from '@/lib/profile'
import { REVIEW_TAGS } from '@/lib/reputation'
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
  reviewer: { id: string; username: string } | null
}

export interface ProfileInfo {
  id: string
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
  isVerified: boolean
}

type ProfileTab = 'sale' | 'wantlist' | 'reviews'

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
  isOwnProfile
}: UserProfileViewProps) {
  const [tab, setTab] = useState<ProfileTab>('sale')
  const [copied, setCopied] = useState(false)
  const [viewer, setViewer] = useState<{
    username?: string
    slotByCardId: Record<string, string>
  } | null>(null)

  const location = formatLocation(profile.city, profile.country)

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

  const initial = (profile.username[0] ?? '?').toUpperCase()

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <SiteNav />

      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Header de identidad y reputación */}
        <header className="mb-8 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500/40 via-rose-500/30 to-sky-500/40 text-3xl font-black text-white ring-2 ring-fuchsia-400/50 shadow-[0_0_35px_rgba(217,70,239,0.35)]">
                {initial}
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
                <h1 className="truncate text-2xl font-bold tracking-tight text-white">
                  {profile.username}
                </h1>
                <p className="truncate text-sm text-slate-400">@{profile.username}</p>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-400">
                {ratingAvg != null ? (
                  <span className="flex items-center gap-1.5">
                    <Stars rating={ratingAvg} />
                    <span className="font-bold text-amber-400">{ratingAvg.toFixed(1)}</span>
                    <span>
                      ({reviewCount} reseña{reviewCount !== 1 ? 's' : ''})
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-500">Sin reseñas aún</span>
                )}
                <span className="text-slate-700">•</span>
                <span>
                  {completedClaims} trato{completedClaims !== 1 ? 's' : ''} confirmado
                  {completedClaims !== 1 ? 's' : ''}
                </span>
                {location && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1">📍 {location}</span>
                  </>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {profile.whatsapp_number ? (
                  <a
                    href={whatsAppLink(profile.whatsapp_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/50 transition-colors hover:bg-emerald-500"
                  >
                    <ChatIcon width={16} height={16} />
                    Enviar WhatsApp
                  </a>
                ) : null}
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
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
              onClick={() => setTab('wantlist')}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-fuchsia-600"
            >
              Ofrecer Swap
            </button>
          </div>
        )}

        {/* Control de pestañas */}
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setTab('sale')}
            aria-pressed={tab === 'sale'}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'sale'
                ? 'bg-binder-accent text-white shadow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            🛍️ En Venta / Trade
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === 'sale' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
              }`}
            >
              {saleCards.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('wantlist')}
            aria-pressed={tab === 'wantlist'}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'wantlist'
                ? 'bg-fuchsia-500 text-white shadow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            ✨ Cartas Buscadas
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === 'wantlist' ? 'bg-white/20 text-white' : 'bg-fuchsia-500/20 text-fuchsia-300'
              }`}
            >
              {wantlist.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('reviews')}
            aria-pressed={tab === 'reviews'}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'reviews'
                ? 'bg-binder-accent text-white shadow'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            }`}
          >
            ⭐ Reseñas
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                tab === 'reviews' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
              }`}
            >
              {reviews.length}
            </span>
          </button>
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {saleCards.map((card) => (
                <MarketCard key={card.id} card={card} />
              ))}
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {wantlist.map((w) => (
                <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
              ))}
            </div>
          ))}

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
                    className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-sm font-bold text-white shadow">
                        {(review.reviewer?.username[0] ?? '?').toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {review.reviewer ? `@${review.reviewer.username}` : 'Comprador'}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(review.createdAt)}</p>
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
