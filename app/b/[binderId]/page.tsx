'use client'

import { useEffect, useState } from 'react'
import BinderSheet, { type SlotCard } from '@/components/BinderSheet'

interface Binder {
  id: string
  title: string
}

interface RawCard {
  id: string
  binder_id: string
  card_id: string
  card_name: string
  set_id: string
  number: string
  slot_number: number
  market_price: number | null
}

const SLOTS_PER_SHEET = 9

function toSlotCard(card: RawCard): SlotCard {
  return {
    ...card,
    image: `https://images.pokemontcg.io/${card.set_id}/${card.number}_hires.png`
  }
}

function groupIntoSheets(cards: SlotCard[]): SlotCard[][] {
  const sheets: SlotCard[][] = []
  for (const card of cards) {
    const sheetIndex = Math.floor((card.slot_number - 1) / SLOTS_PER_SHEET)
    if (!sheets[sheetIndex]) sheets[sheetIndex] = []
    sheets[sheetIndex].push(card)
  }
  for (let i = 0; i < sheets.length; i++) {
    if (!sheets[i]) sheets[i] = []
  }
  return sheets
}

function padSheet(cards: SlotCard[]): (SlotCard | null)[] {
  const arr: (SlotCard | null)[] = Array(SLOTS_PER_SHEET).fill(null)
  for (const card of cards) {
    const idx = (card.slot_number - 1) % SLOTS_PER_SHEET
    arr[idx] = card
  }
  return arr
}

export default function PublicBinderPage({ params }: { params: Promise<{ binderId: string }> }) {
  const [binderId, setBinderId] = useState<string | null>(null)
  const [binder, setBinder] = useState<Binder | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)

  useEffect(() => {
    params.then(({ binderId }) => setBinderId(binderId))
  }, [params])

  useEffect(() => {
    if (!binderId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/public/binder/${binderId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        setBinder(data.binder)
        setCards((data.cards || []).map(toSlotCard))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Binder no encontrado')
      } finally {
        setLoading(false)
      }
    })()
  }, [binderId])

  const totalValue = cards.reduce((sum, c) => sum + (c.market_price ?? 0), 0)
  const sheets = groupIntoSheets(cards)
  if (sheets.length === 0) sheets.push([])

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl border border-white/10 bg-binder-sheet px-6 py-10 text-center">
          <h1 className="text-xl font-bold text-slate-200">Profesor TCG</h1>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profesor TCG</h1>
          <p className="text-sm text-slate-400">
            {binder?.title ?? 'Cargando…'} · {cards.length} cartas en {sheets.length} hoja
            {sheets.length !== 1 ? 's' : ''} · vista pública
          </p>
        </div>

        <div className="rounded-xl border border-yellow-400/30 bg-gradient-to-b from-yellow-400/15 to-yellow-400/5 px-4 py-2 text-right">
          <p className="text-[10px] uppercase tracking-widest text-yellow-300/70">Valor total</p>
          <p className="text-xl font-bold text-yellow-300">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <span className="text-xs font-semibold text-yellow-300/60">USD</span>
          </p>
        </div>
      </header>

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando binder…</p>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((offset) => {
              const sheetIndex = currentSheet * 2 + offset
              const sheetCards = sheets[sheetIndex]
              if (!sheetCards) return null
              return (
                <BinderSheet
                  key={sheetIndex}
                  sheetNumber={sheetIndex + 1}
                  slots={padSheet(sheetCards)}
                />
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentSheet((p) => Math.max(0, p - 1))}
              disabled={currentSheet === 0}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              ◄ Anterior
            </button>
            <span className="text-sm text-slate-400">
              {currentSheet + 1} / {Math.max(1, Math.ceil(sheets.length / 2))}
            </span>
            <button
              onClick={() => setCurrentSheet((p) => p + 1)}
              disabled={currentSheet * 2 + 1 >= sheets.length}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              Siguiente ►
            </button>
          </div>
        </>
      )}
    </div>
  )
}