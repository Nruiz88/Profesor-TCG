'use client'

import { useCallback, useEffect, useState } from 'react'
import BinderSheet, { type SlotCard } from '@/components/BinderSheet'
import AddCardModal from '@/components/AddCardModal'
import SlotSearchModal, { type SearchResult } from '@/components/SlotSearchModal'

interface Page {
  id: string
  name: string
  position: number
  slots: SlotCard[]
}

interface PickedCard {
  id: string
  name: string
  number: string
  rarity: string | null
  image: string
}

interface SlotTarget {
  pageId: string
  slot: number
}

const SHEET_SIZE = 9

function sheetSlots(slots: SlotCard[]): (SlotCard | null)[] {
  const arr: (SlotCard | null)[] = Array(SHEET_SIZE).fill(null)
  for (const s of slots) {
    if (s.slot >= 0 && s.slot < SHEET_SIZE) arr[s.slot] = s
  }
  return arr
}

export default function BinderPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [slotTarget, setSlotTarget] = useState<SlotTarget | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadBinder = useCallback(async () => {
    try {
      const res = await fetch('/api/binder')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setPages(data.pages || [])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar el binder')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBinder()
  }, [loadBinder])

  const totalValue = pages.reduce(
    (sum, page) => sum + page.slots.reduce((s, c) => s + (c.market_price ?? 0), 0),
    0
  )
  const totalCards = pages.reduce((sum, page) => sum + page.slots.length, 0)

  async function updatePrices() {
    const cardIds = pages.flatMap((p) => p.slots.map((s) => s.card_id))
    if (cardIds.length === 0) return

    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/binder/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds })
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

  async function addPage() {
    try {
      const res = await fetch('/api/binder/pages', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadBinder()
      setShowAdd(true)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear hoja')
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
    if (!slotTarget) throw new Error('Sin slot objetivo')

    const setParts = card.id.split('-')
    const setId = setParts[0]

    const res = await fetch('/api/binder/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_id: slotTarget.pageId,
        slot: slotTarget.slot,
        card_id: card.id,
        card_name: card.name,
        card_set_id: setId,
        card_set_name: card.set_name,
        card_number: card.number,
        card_rarity: card.rarity,
        card_image: card.image
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar carta')
    await loadBinder()
  }

  async function addCard(card: PickedCard) {
    const setParts = card.id.split('-')
    const setId = setParts[0]
    const number = card.number || setParts.slice(1).join('-')

    try {
      let targetPage = pages.find((p) => p.slots.length < SHEET_SIZE)

      if (!targetPage) {
        const res = await fetch('/api/binder/pages', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al crear hoja')
        await loadBinder()
        targetPage = (await fetch('/api/binder').then((r) => r.json())).pages.find(
          (p: Page) => p.slots.length < SHEET_SIZE
        )
      }

      if (!targetPage) {
        setMessage('No hay espacio en el binder')
        return
      }

      const occupied = new Set(targetPage.slots.map((s) => s.slot))
      let freeSlot = 0
      while (occupied.has(freeSlot)) freeSlot++

      const res = await fetch('/api/binder/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: targetPage.id,
          slot: freeSlot,
          card_id: card.id,
          card_name: card.name,
          card_set_id: setId,
          card_set_name: setId.toUpperCase(),
          card_number: number,
          card_rarity: card.rarity,
          card_image: card.image
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al agregar carta')
      await loadBinder()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al agregar carta')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profesor TCG</h1>
          <p className="text-sm text-slate-400">
            {totalCards} cartas en {pages.length} hoja{pages.length !== 1 ? 's' : ''}
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

          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/20"
          >
            + Agregar carta
          </button>

          <button
            onClick={addPage}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            + Nueva hoja
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
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 py-20 text-center">
          <p className="text-slate-400">Tu binder está vacío.</p>
          <button
            onClick={addPage}
            className="mt-4 rounded-xl bg-binder-accent px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Crear primera hoja
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {pages.map((page) => (
            <BinderSheet
              key={page.id}
              name={page.name}
              slots={sheetSlots(page.slots)}
              onRemoveSlot={removeSlot}
              onEmptySlotClick={(slot) => setSlotTarget({ pageId: page.id, slot })}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddCardModal
          onClose={() => setShowAdd(false)}
          onAdd={addCard}
        />
      )}

      {slotTarget && (
        <SlotSearchModal
          slotLabel={`Hoja ${(pages.find((p) => p.id === slotTarget.pageId)?.position ?? 0) + 1} · bolsillo ${slotTarget.slot + 1}`}
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