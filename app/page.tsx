'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BinderSheet, { type SlotCard } from '@/components/BinderSheet'
import SlotSearchModal, { type SearchResult } from '@/components/SlotSearchModal'
import { createClient } from '@/lib/supabase/client'
import { createBinder, deleteBinder, getUserBinders } from '@/lib/binders'

interface Binder {
  id: string
  title: string
  is_public?: boolean
  created_at?: string
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

export default function BinderPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string | undefined; id: string } | null>(null)
  const [binders, setBinders] = useState<Binder[]>([])
  const [binder, setBinder] = useState<Binder | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [slotTarget, setSlotTarget] = useState<{ sheetIndex: number; slotIndex: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [activeBinderId, setActiveBinderId] = useState<string | null>(null)

  const loadBinder = useCallback(async (binderId?: string) => {
    try {
      const id = binderId ?? activeBinderId
      const url = id ? `/api/binder?binderId=${id}` : '/api/binder'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBinder(data.binder)
      setCards((data.cards || []).map(toSlotCard))
      if (!binderId) setActiveBinderId(data.binder.id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar el binder')
    } finally {
      setLoading(false)
    }
  }, [activeBinderId])

  const loadBinders = useCallback(async (userId: string) => {
    try {
      const list = await getUserBinders(userId)
      setBinders(list)
    } catch {
      // se reporta via message en loadBinder
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u ? { email: u.email, id: u.id } : null)
      if (u) loadBinders(u.id)
    })
    loadBinder()
  }, [loadBinder, loadBinders])

  async function selectBinder(binderId: string) {
    setLoading(true)
    setActiveBinderId(binderId)
    setCurrentSheet(0)
    await loadBinder(binderId)
  }

  async function handleCreateBinder() {
    if (!user) return
    setMessage(null)
    try {
      const title = window.prompt('Nombre del binder:', `Binder ${binders.length + 1}`)
      if (!title) return
      const created = await createBinder(user.id, title.trim())
      setBinders((prev) => [...prev, created])
      setMessage(`Binder "${created.title}" creado.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al crear binder')
    }
  }

  async function handleDeleteBinder() {
    if (!binder || !user) return
    if (!window.confirm(`¿Eliminar el binder "${binder.title}" y todas sus cartas?`)) return
    setMessage(null)
    try {
      await deleteBinder(binder.id)
      const remaining = binders.filter((b) => b.id !== binder.id)
      setBinders(remaining)
      if (remaining.length > 0) {
        await selectBinder(remaining[0].id)
      } else {
        setBinder(null)
        setCards([])
      }
      setMessage('Binder eliminado.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al eliminar binder')
    }
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function togglePublic() {
    if (!binder) return
    setMessage(null)
    try {
      const next = !binder.is_public
      const res = await fetch('/api/binder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binderId: binder.id, is_public: next })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBinder(data.binder)
      setBinders((prev) => prev.map((b) => (b.id === data.binder.id ? data.binder : b)))
      setMessage(next ? 'Binder público: cualquiera con el link puede verlo.' : 'Binder privado.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al actualizar visibilidad')
    }
  }

  async function copyShareLink() {
    if (!binder) return
    const url = `${window.location.origin}/b/${binder.id}`
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copiado al portapapeles.')
    } catch {
      window.prompt('Copiá el link:', url)
    }
  }

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
            {user?.email ? ` · ${user.email}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={binder?.id ?? ''}
            onChange={(e) => e.target.value && selectBinder(e.target.value)}
            className="rounded-xl border border-white/10 bg-binder-sheet px-3 py-2.5 text-sm text-slate-200 focus:border-binder-accent focus:outline-none"
          >
            {binders.length === 0 && <option value="">Sin binder</option>}
            {binders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateBinder}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            + Nuevo
          </button>

          {binder && (
            <button
              onClick={handleDeleteBinder}
              className="rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10"
            >
              Eliminar
            </button>
          )}

          {binder && (
            <button
              onClick={togglePublic}
              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                binder.is_public
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20'
                  : 'border-white/10 text-slate-300 hover:bg-white/5'
              }`}
            >
              {binder.is_public ? 'Público' : 'Privado'}
            </button>
          )}

          {binder?.is_public && (
            <button
              onClick={copyShareLink}
              className="rounded-xl bg-binder-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              Compartir
            </button>
          )}

          <button
            onClick={logout}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
          >
            Cerrar sesión
          </button>
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
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((offset) => {
              const sheetIndex = currentSheet * 2 + offset
              const sheetCards = sheets[sheetIndex]
              if (!sheetCards) {
                if (sheets.length === 0 && sheetIndex === 0) {
                  return (
                    <BinderSheet
                      key={sheetIndex}
                      sheetNumber={1}
                      slots={Array(9).fill(null)}
                      onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
                    />
                  )
                }
                return null
              }
              return (
                <BinderSheet
                  key={sheetIndex}
                  sheetNumber={sheetIndex + 1}
                  slots={padSheet(sheetCards)}
                  onRemoveSlot={removeSlot}
                  onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
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