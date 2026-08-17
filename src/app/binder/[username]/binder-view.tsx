'use client'

import { useEffect, useState } from 'react'
import SiteNav from '@/components/SiteNav'
import BinderSheet from '@/components/BinderSheet'
import SheetPagination from '@/components/SheetPagination'
import SellerInfoBadge, { type SellerInfo } from '@/components/SellerInfoBadge'
import SellerReputationCard from '@/components/SellerReputationCard'
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

export default function PublicBinderByUsernamePage({ username }: { username: string }) {
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
        const res = await fetch(`/api/public/by-username/${encodeURIComponent(username)}`)
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
  }, [username])

  const totalValue = computeTotalValue(cards)
  const sheets = groupIntoSheets(cards)
  if (sheets.length === 0) sheets.push([])

  if (error) {
    return (
      <div className="min-h-screen text-slate-200">
        <SiteNav />
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-10 text-center">
            <h1 className="text-xl font-bold text-white">Profesor TCG</h1>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-slate-200">
      <SiteNav />
      <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Profesor TCG</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-400">{binder?.title ?? 'Cargando…'}</span>
            <span className="text-slate-700">•</span>
            <span>
              {cards.length} cartas en {sheets.length} hoja{sheets.length !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">vista pública</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-3">
          <div className="w-full rounded-xl border border-yellow-400/20 bg-slate-900 px-4 py-2 text-right sm:w-64">
            <p className="text-[10px] uppercase tracking-widest text-yellow-400/50">Valor total</p>
            <p className="text-lg font-bold text-yellow-400">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-semibold text-yellow-400/50">USD</span>
            </p>
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
        </>
      )}
      </div>
    </div>
  )
}
