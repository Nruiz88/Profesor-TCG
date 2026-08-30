'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BinderSheet from '@/components/BinderSheet'
import type { SellerInfo } from '@/components/SellerInfoBadge'
import RecentActivityTimeline from '@/components/RecentActivityTimeline'
import PokemonCard from '@/components/PokemonCard'
import { ChatIcon, DiscordIcon, PokeballIcon } from '@/components/icons'
import { effectivePrice } from '@/lib/cardStatus'
import { formatPrice } from '@/lib/priceGuide'
import { formatCondition } from '@/lib/cardCondition'
import { normalizeLanguage, CARD_LANGUAGE_META } from '@/lib/cardLanguage'
import { whatsAppLink } from '@/lib/profile'
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
import { computeTrainerScore, type TrainerScore } from '@/lib/trainer'
import {
  computeTotalValue,
  groupIntoSheets,
  padSheet,
  toSlotCard,
  type RawCard,
  type SlotCard
} from '@/lib/sheets'

interface Binder {
  id: string
  title: string
  background?: string | null
}

interface ExtendedSellerInfo extends SellerInfo {
  is_verified?: boolean
  total_sales?: number
  total_trades?: number
  review_count?: number
}

export default function PublicBinderByUsernamePage({
  username,
  binderId
}: {
  username: string
  binderId?: string
}) {
  const [binder, setBinder] = useState<Binder | null>(null)
  const [seller, setSeller] = useState<ExtendedSellerInfo | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null)
  const [trainerScore, setTrainerScore] = useState<TrainerScore | null>(null)

  useEffect(() => {
    if (!username) return
    ;(async () => {
      try {
        // Con ?binderId=<id> mostramos ESE binder concreto (no el primero).
        // Sin binderId, resolvemos el primer binder público del usuario.
        const endpoint = binderId
          ? `/api/public/binder/${encodeURIComponent(binderId)}`
          : `/api/public/by-username/${encodeURIComponent(username)}`
        const res = await fetch(endpoint)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Binder no encontrado')
        setBinder(data.binder)
        setSeller(data.owner ?? null)
        const slotCards = ((data.cards || []) as RawCard[]).map(toSlotCard)
        setCards(slotCards)

        // Compute trainer score from owner data
        if (data.owner) {
          setTrainerScore(computeTrainerScore({
            capturedSpecies: 0,
            completedSales: data.owner.total_sales ?? 0,
            completedTrades: data.owner.total_trades ?? 0,
            completedBuys: 0,
            reviewCount: data.owner.review_count ?? 0
          }))
        }

        // Deep-link desde el marketplace: ?card=<id> → hoja + scroll + resaltado
        const targetId = new URLSearchParams(window.location.search).get('card')
        if (targetId) {
          const target = slotCards.find((c) => c.id === targetId)
          if (target) {
            const sheetIndex = Math.floor((target.slot_number - 1) / 9)
            setCurrentSheet(Math.floor(sheetIndex / 2))
            setHighlightCardId(targetId)
            setTimeout(() => {
              document
                .querySelector(`[data-card-id="${targetId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 400)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Binder no encontrado')
      } finally {
        setLoading(false)
      }
    })()
  }, [username, binderId])

  const totalValue = computeTotalValue(cards)
  const sheets = groupIntoSheets(cards)
  if (sheets.length === 0) sheets.push([])

  // Stats públicas (derivadas de las cartas expuestas)
  const saleCount = cards.filter((c) => c.is_for_sale).length
  const tradeCount = cards.filter((c) => c.is_for_trade).length

  // Progreso por set (cartas agrupadas)
  const binderSets = (() => {
    const bySet = new Map<string, number>()
    for (const c of cards) bySet.set(c.set_id, (bySet.get(c.set_id) ?? 0) + (c.quantity ?? 1))
    return [...bySet.entries()]
      .map(([set_id, count]) => ({ set_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  })()

  const initial = (seller?.username?.[0] ?? '?').toUpperCase()

  // Carta destacada por deep-link (?card=<id>): presentación de compra.
  const featuredCard = highlightCardId
    ? cards.find((c) => c.id === highlightCardId) ?? null
    : null
  const featuredPrice = featuredCard
    ? effectivePrice(featuredCard.market_price, featuredCard.price_override, featuredCard.price, featuredCard.manual_price)
    : null

  if (error) {
    return (
      <div className="min-h-screen text-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-10 text-center">
            <h1 className="text-xl font-bold text-white">TCG Claim</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6">
        {/* ─── Header: identidad del coleccionista (diseño binder) ─── */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00ffcc]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800 bg-gradient-to-tr from-[#00ffcc]/30 via-violet-500/20 to-rose-500/30 text-3xl font-black text-white shadow-[0_0_30px_rgba(0,255,204,0.35)]">
                  {initial}
                </div>
                <div className="absolute -inset-1.5 rounded-full border border-[#00ffcc]/25" />
                {seller?.is_verified && (
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ffcc] text-xs font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.6)]">
                    ✓
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="truncate text-2xl font-extrabold tracking-tight text-white">
                    {binder?.title ?? 'Cargando…'}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Vista pública
                  </span>
                  {trainerScore && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      <span className="text-sm">{trainerScore.rank.icon}</span> {trainerScore.rank.name}
                    </span>
                  )}
                  {seller?.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                      ⚡ Verificado
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm text-slate-400">
                  {seller?.username ? (
                    <Link
                      href={`/profile/${encodeURIComponent(seller.username)}`}
                      className="font-medium text-[#00ffcc] underline-offset-4 transition-colors hover:text-[#00ffcc]/80 hover:underline"
                    >
                      @{seller.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-300">@{binder ? 'usuario' : '…'}</span>
                  )}
                  <span className="text-slate-700"> · </span>
                  <span>
                    {cards.length} carta{cards.length !== 1 ? 's' : ''} en {sheets.length} hoja
                    {sheets.length !== 1 ? 's' : ''}
                  </span>
                </p>

                {trainerScore && trainerScore.nextRank && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 w-32 overflow-hidden rounded-full border border-slate-700/50 bg-slate-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_8px_rgba(241,193,0,0.4)]"
                        style={{ width: `${Math.round(trainerScore.progress * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {trainerScore.xp.toLocaleString('en-US')} XP · {trainerScore.nextRank.icon} {trainerScore.nextRank.name}
                    </span>
                  </div>
                )}

                {/* Stats con iconos */}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <span className="text-[#00ffcc]">🃏</span>
                    <span className="font-semibold text-white">{cards.length}</span>
                    carta{cards.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-400">
                    <span className="text-yellow-400">$</span>
                    <span className="font-semibold text-yellow-400">
                      ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500">USD</span>
                  </div>
                  {saleCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <span className="text-emerald-400">🏷️</span>
                      <span className="font-semibold text-emerald-400">{saleCount}</span>
                      en venta
                    </div>
                  )}
                  {tradeCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <span className="text-sky-400">🔄</span>
                      <span className="font-semibold text-sky-400">{tradeCount}</span>
                      cambio
                    </div>
                  )}
                </div>

                {/* Barra de colección */}
                <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#00ffcc]/70 to-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.5)]"
                    style={{ width: `${Math.min(100, sheets.length * 11)}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {sheets.length} hoja{sheets.length !== 1 ? 's' : ''} · {Math.min(100, sheets.length * 11)}%
                </p>
              </div>
            </div>

            {/* Acciones: WhatsApp */}
            <div className="flex shrink-0 flex-col gap-3 lg:items-end">
              {seller?.whatsapp_number && (
                <a
                  href={whatsAppLink(seller.whatsapp_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgba(37,211,102,0.12)] px-4 py-2 text-sm font-bold text-[#25D366] ring-1 ring-[#25D366]/40 transition-all hover:bg-[rgba(37,211,102,0.2)]"
                >
                  <ChatIcon className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Panel destacado: carta individual por deep-link (?card=) */}
        {featuredCard && (
          <div className="mb-8 overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-b from-slate-900 to-[#100f1c] shadow-[0_20px_60px_-20px_rgba(244,63,94,0.25)]">
            <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
              <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative mx-auto w-48 shrink-0 drop-shadow-[0_18px_35px_rgba(0,0,0,0.6)] sm:w-56 lg:mx-0">
                <PokemonCard card={featuredCard} />
              </div>

              <div className="relative min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-rose-300">
                  <PokeballIcon width={13} height={13} />
                  {featuredCard.is_for_sale && featuredCard.is_for_trade
                    ? 'En venta o cambio'
                    : featuredCard.is_for_sale
                      ? 'En venta'
                      : 'Acepta cambios'}
                </span>

                <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {featuredCard.card_name}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {featuredCard.set_id.toUpperCase()} · #{featuredCard.number}
                </p>

                <div className="mt-4">
                  {featuredPrice != null ? (
                    <p className="text-3xl font-black text-yellow-400">
                      {formatPrice(featuredPrice, featuredCard.currency)}
                      <span className="ml-1.5 text-sm font-semibold text-yellow-400/60">USD</span>
                    </p>
                  ) : (
                    <p className="text-2xl font-black text-slate-300">Consultar precio</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {featuredCard.condition && (
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-semibold text-slate-300">
                      {formatCondition(featuredCard.condition) ?? featuredCard.condition}
                    </span>
                  )}
                  {(() => {
                    const meta = CARD_LANGUAGE_META[normalizeLanguage(featuredCard.language)]
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-semibold text-slate-300">
                        <span aria-hidden="true">{meta.flag}</span>
                        {meta.label}
                      </span>
                    )
                  })()}
                  {(featuredCard.quantity ?? 1) > 1 && (
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 font-semibold text-slate-300">
                      x{featuredCard.quantity}
                    </span>
                  )}
                </div>

                {seller?.whatsapp_number && (
                  <a
                    href={`${whatsAppLink(seller.whatsapp_number)}?text=${encodeURIComponent(
                      `¡Hola @${seller.username ?? 'coleccionista'}! Vi tu carta "${featuredCard.card_name}" (${featuredCard.set_id.toUpperCase()} ${featuredCard.number}) en TCG Claim. ¿Sigue disponible? Quiero hacer un claim.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-black text-[#05331a] shadow-lg shadow-emerald-950/50 transition-all hover:brightness-110"
                  >
                    <ChatIcon width={17} height={17} />
                    Comprar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-20 text-center text-slate-500">Cargando binder…</p>
        ) : (
          <>
            {/* ─── Binder con fondo panorámico + sidebar ─── */}
            <div className="flex flex-col gap-5 lg:flex-row">
              <div className="min-w-0 flex-1 space-y-5">
                <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/70 shadow-2xl">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
                    style={{
                      backgroundImage: `url(${binderBackgroundForSheet(currentSheet * 2 + 1, binder?.background)})`
                    }}
                  />
                  <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090d16]/80 via-transparent to-[#090d16]/90" />

                  <div className="relative z-10 flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-4 py-6 binder-scroll">
                    {[0, 1].map((offset) => {
                      const sheetIndex = currentSheet * 2 + offset
                      const sheetCards = sheets[sheetIndex]
                      return (
                        <div
                          key={sheetIndex}
                          className="flex min-w-[calc(100%-2rem)] snap-center flex-col gap-3 md:min-w-[calc(50%-1rem)]"
                        >
                          <div className="flex items-center justify-between px-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-md">
                              Hoja {sheetIndex + 1}
                            </h3>
                            <span className="rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-slate-400 backdrop-blur-md">
                              {(sheetCards ? padSheet(sheetCards) : Array(9).fill(null)).filter(Boolean).length}/9
                            </span>
                          </div>
                          <BinderSheet
                            sheetNumber={sheetIndex + 1}
                            slots={sheetCards ? padSheet(sheetCards) : Array(9).fill(null)}
                            seller={seller}
                            highlightCardId={highlightCardId}
                            background={binder?.background}
                          />
                        </div>
                      )
                    })}
                  </div>

                  {/* Paginación flotante */}
                  <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-800 bg-slate-950/90 px-5 py-1.5 backdrop-blur-xl">
                    <button
                      onClick={() => setCurrentSheet(Math.max(0, currentSheet - 1))}
                      disabled={currentSheet === 0}
                      className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30"
                      aria-label="Hoja anterior"
                    >
                      ‹
                    </button>
                    <span className="font-mono text-xs font-semibold text-slate-300">
                      {currentSheet + 1} / {Math.max(1, sheets.length)}
                    </span>
                    <button
                      onClick={() => setCurrentSheet(Math.min(sheets.length - 1, currentSheet + 1))}
                      disabled={currentSheet >= sheets.length - 1}
                      className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30"
                      aria-label="Hoja siguiente"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar derecha */}
              <aside className="w-full shrink-0 space-y-4 lg:w-64">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <span className="text-[#00ffcc]">◉</span>
                    Progreso por Set
                  </h3>
                  {binderSets.length === 0 ? (
                    <p className="text-xs text-slate-500">Sin cartas todavía.</p>
                  ) : (
                    <div className="space-y-3">
                      {binderSets.map((s) => (
                        <div key={s.set_id}>
                          <div className="mb-1 flex justify-between text-xs">
                            <span className="truncate font-medium text-slate-300">
                              {s.set_id.toUpperCase()}
                            </span>
                            <span className="font-mono text-[#00ffcc]">{s.count}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                            <div
                              className="h-full rounded-full bg-[#00ffcc]/70 shadow-[0_0_8px_rgba(0,255,204,0.4)]"
                              style={{ width: `${Math.max(6, (s.count / Math.max(1, binderSets[0].count)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                    <p className="text-2xl font-extrabold text-emerald-400">{saleCount}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      En venta
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-center backdrop-blur-xl">
                    <p className="text-2xl font-extrabold text-sky-400">{tradeCount}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Cambios
                    </p>
                  </div>
                </div>

                <RecentActivityTimeline mode="community" limit={4} />

                <a
                  href="https://discord.gg/NxuWmFKPuZ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pulse-glow flex w-full items-center justify-center gap-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-4 text-sm font-bold text-[#5865F2] transition-all hover:bg-[#5865F2]/20 active:scale-[0.98]"
                >
                  <DiscordIcon className="h-6 w-6" />
                  Unirme al Discord
                </a>
              </aside>
            </div>

            <p className="mt-10 text-center text-xs text-slate-600">
              Álbum creado con{' '}
              <Link href="/" className="font-semibold text-rose-400/80 transition-colors hover:text-rose-300">
                TCG Claim
              </Link>{' '}
              · Vende y cambia tus cartas por WhatsApp
            </p>
          </>
        )}
      </div>
    </div>
  )
}
