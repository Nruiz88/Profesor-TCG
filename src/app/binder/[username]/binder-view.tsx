'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BinderSheet from '@/components/BinderSheet'
import SheetPagination from '@/components/SheetPagination'
import SellerInfoBadge, { type SellerInfo } from '@/components/SellerInfoBadge'
import SellerReputationCard from '@/components/SellerReputationCard'
import { PokeballIcon } from '@/components/icons'
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
}

export default function PublicBinderByUsernamePage({
  username,
  binderId
}: {
  username: string
  binderId?: string
}) {
  const [binder, setBinder] = useState<Binder | null>(null)
  const [seller, setSeller] = useState<SellerInfo | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null)

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
    <div className="min-h-screen text-slate-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl">
        {/* Acentos neón superior e inferior */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
        {/* Glows decorativos de fondo */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />
        {/* Watermark de pokébola */}
        <PokeballIcon className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 text-white/[0.03]" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-300">
              <PokeballIcon width={13} height={13} />
              Binder de coleccionista
            </span>
            <h1 className="mt-3 truncate bg-gradient-to-r from-white via-rose-100 to-amber-100 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              {binder?.title ?? 'Cargando…'}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-400">
              {seller?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(seller.username)}`}
                  className="font-medium text-rose-300 underline-offset-4 transition-colors hover:text-rose-200 hover:underline"
                >
                  @{seller.username}
                </Link>
              ) : (
                <span className="font-medium text-slate-300">@{binder ? 'usuario' : '…'}</span>
              )}
              <span className="text-slate-700">•</span>
              <span>
                {cards.length} carta{cards.length !== 1 ? 's' : ''} en {sheets.length} hoja
                {sheets.length !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                Vista pública
              </span>
            </p>
          </div>

          <div className="shrink-0">
            <div className="rounded-2xl border border-yellow-400/25 bg-gradient-to-br from-yellow-400/10 to-amber-500/5 px-5 py-3 text-right shadow-[0_0_30px_rgba(250,204,21,0.08)]">
              <p className="text-[10px] uppercase tracking-widest text-yellow-400/60">
                Valor total estimado
              </p>
              <p className="mt-0.5 text-2xl font-black text-yellow-400">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-semibold text-yellow-400/60">USD</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-8 space-y-4">
        <SellerInfoBadge seller={seller} />
        <SellerReputationCard username={seller?.username} />
      </div>

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando binder…</p>
      ) : (
        <>
          {/* Divisor temático del álbum */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              🗂️ Álbum de cartas
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((offset) => {
              const sheetIndex = currentSheet * 2 + offset
              const sheetCards = sheets[sheetIndex]
              return (
                <BinderSheet
                  key={sheetIndex}
                  sheetNumber={sheetIndex + 1}
                  slots={sheetCards ? padSheet(sheetCards) : Array(9).fill(null)}
                  seller={seller}
                  highlightCardId={highlightCardId}
                />
              )
            })}
          </div>

          <SheetPagination
            current={currentSheet}
            sheetCount={sheets.length}
            onChange={setCurrentSheet}
          />

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
