'use client'

import { useCallback, useEffect, useState } from 'react'
import BinderSheet, { type SlotCard } from '@/components/BinderSheet'
import SlotSearchModal, { type SearchResult } from '@/components/SlotSearchModal'

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

export default function BinderPage() {
  const [binder, setBinder] = useState<Binder | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [slotTarget, setSlotTarget] = useState<{ sheetIndex: number; slotIndex: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadBinder = useCallback(async () => {
    try {
      const res = await fetch('/api/binder')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBinder(data.binder)
      setCards((data.cards || []).map(toSlotCard))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar el binder')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBinder()
  }, [loadBinder])

  const totalValue = cards.reduce((sum, c) => sum + (c.market_price ?? 0), 0)
  const totalCards = cards.length

  const sheets = groupIntoSheets(cards)
  // Siempre mostramos al menos una hoja vacía al final para poder agregar
  if (sheets.length === 0) sheets.push([])

  async function updatePrices() {
    if (!binder) return

    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/binder/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binderId: binder.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMessage(`Precios actualizados: ${data.cards} cartas, ${data.withPrice} con precio.`)
      await loadBinder()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al actualizar precios')
    } finally {
      setUpdating(false)
    }
  }

  async function removeSlot(slotId: string) {
    try {
      const res = await fetch(`/api/binder/slots/${slotId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadBinder()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al quitar carta')
    }
  }

  async function addCardToSlot(card: SearchResult) {
    if (!binder || !slotTarget) throw new Error('Sin binder o slot objetivo')

    const slotNumber = slotTarget.sheetIndex * SLOTS_PER_SHEET + slotTarget.slotIndex + 1

    const res = await fetch('/api/binder/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        binder_id: binder.id,
        slot_number: slotNumber,
        card_id: card.id,
        card_name: card.name,
        set_id: card.set_id,
        number: card.number
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar carta')
    await loadBinder()
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profesor TCG</h1>
          <p className="text-sm text-slate-400">
            {binder?.title} · {totalCards} cartas en {sheets.length} hoja{sheets.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-yellow-400/30 bg-gradient-to-b from-yellow-400/15 to-yellow-400/5 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-widest text-yellow-300/70">Valor total</p>
            <p className="text-xl font-bold text-yellow-300">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-semibold text-yellow-300/60">USD</span>
            </p>
          </div>

          <button
            onClick={updatePrices}
            disabled={updating || totalCards === 0}
            className="rounded-xl bg-binder-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
          >
            {updating ? 'Actualizando…' : 'Actualizar precios'}
          </button>
        </div>
      </header>

      {message && (
        <div className="mb-4 rounded-xl border border-white/10 bg-binder-sheet px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando binder…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {sheets.map((sheetCards, sheetIndex) => (
            <BinderSheet
              key={sheetIndex}
              sheetNumber={sheetIndex + 1}
              slots={padSheet(sheetCards)}
              onRemoveSlot={removeSlot}
              onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
            />
          ))}
        </div>
      )}

      {slotTarget && (
        <SlotSearchModal
          slotLabel={`Hoja ${slotTarget.sheetIndex + 1} · bolsillo ${slotTarget.slotIndex + 1}`}
          onClose={() => setSlotTarget(null)}
          onSelect={async (card) => {
            await addCardToSlot(card)
            setSlotTarget(null)
          }}
        />
      )}
    </div>
  )
}