'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BinderSheet from '@/components/BinderSheet'
import SheetPagination from '@/components/SheetPagination'
import SlotSearchModal, { type SearchResult } from '@/components/SlotSearchModal'
import ProfileSettings from '@/components/ProfileSettings'
import ProfileRequiredModal from '@/components/ProfileRequiredModal'
import EditCardModal from '@/components/EditCardModal'
import BinderSettingsModal from '@/components/BinderSettingsModal'
import BinderToolbar from '@/components/BinderToolbar'
import ProfileHeaderStats from '@/components/ProfileHeaderStats'
import {
  CompassIcon,
  FolderIcon,
  GearIcon,
  GlobeIcon,
  LockIcon,
  LogoutIcon,
  PlusIcon,
  RefreshIcon,
  ShareIcon,
  ShieldIcon,
  SwapIcon,
  TrashIcon,
  UserIcon
} from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { createBinder, deleteBinder, getUserBinders } from '@/lib/binders'
import type { Profile } from '@/lib/profile'
import { effectivePrice, type Availability } from '@/lib/cardStatus'
import {
  SLOTS_PER_SHEET,
  groupIntoSheets,
  padSheet,
  sheetPageCount,
  toSlotCard,
  type SlotCard
} from '@/lib/sheets'

interface Binder {
  id: string
  title: string
  description?: string | null
  is_public?: boolean
  cover_card_id?: string | null
  created_at?: string
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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  const [editCard, setEditCard] = useState<SlotCard | null>(null)
  const [requireProfileFor, setRequireProfileFor] = useState<Availability | null>(null)
  const [search, setSearch] = useState('')
  const [saleOnly, setSaleOnly] = useState(false)
  const [tradeOnly, setTradeOnly] = useState(false)
  const [settingsModal, setSettingsModal] = useState<'create' | 'edit' | null>(null)

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

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (res.ok && data.profile) setProfile(data.profile)
    } catch {
      // perfil no disponible: se reintenta al abrir configuración
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
    loadProfile()
  }, [loadBinder, loadBinders, loadProfile])

  async function selectBinder(binderId: string) {
    setLoading(true)
    setActiveBinderId(binderId)
    setCurrentSheet(0)
    await loadBinder(binderId)
  }

  // Crear una carpeta nueva desde el modal de configuración
  async function handleSaveBinder(values: {
    title: string
    description: string | null
    isPublic: boolean
    coverCardId: string | null
  }) {
    if (!user) return
    setMessage(null)
    const created = await createBinder(user.id, values.title, {
      description: values.description,
      is_public: values.isPublic,
      cover_card_id: values.coverCardId
    })
    setBinders((prev) => [...prev, created])
    await selectBinder(created.id)
    setMessage(`Carpeta "${created.title}" creada.`)
  }

  // Actualizar título / descripción / privacidad / portada de la carpeta actual
  async function handleUpdateBinder(values: {
    title: string
    description: string | null
    isPublic: boolean
    coverCardId: string | null
  }) {
    if (!binder) return
    setMessage(null)
    const res = await fetch('/api/binder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        binderId: binder.id,
        title: values.title,
        description: values.description,
        is_public: values.isPublic,
        cover_card_id: values.coverCardId
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    setBinder(data.binder)
    setBinders((prev) => prev.map((b) => (b.id === data.binder.id ? data.binder : b)))
    setMessage('Carpeta actualizada.')
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
    router.push('/')
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
    // Si está privado, lo hacemos público automáticamente al compartir
    if (!binder.is_public) {
      const res = await fetch('/api/binder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binderId: binder.id, is_public: true })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBinder(data.binder)
      setBinders((prev) => prev.map((b) => (b.id === data.binder.id ? data.binder : b)))
    }
    const url = `${window.location.origin}/b/${binder.id}`
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Link copiado al portapapeles. El binder ahora es público.')
    } catch {
      window.prompt('Copiá el link:', url)
    }
  }

  // Estadísticas del perfil (sobre todas las cartas, sin filtros)
  const totalCards = cards.length
  const saleCount = cards.filter((c) => c.is_for_sale).length
  const tradeCount = cards.filter((c) => c.is_for_trade).length
  const totalValue = cards.reduce(
    (sum, c) => sum + (effectivePrice(c.market_price, c.price_override, c.price) ?? 0),
    0
  )

  // Filtros del visor (búsqueda + disponibilidad) — client-side, sin refetch
  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter((c) => {
      if (saleOnly && !c.is_for_sale) return false
      if (tradeOnly && !c.is_for_trade) return false
      if (q) {
        const name = c.card_name.toLowerCase()
        const num = String(c.number).toLowerCase()
        if (!name.includes(q) && !num.includes(q)) return false
      }
      return true
    })
  }, [cards, search, saleOnly, tradeOnly])

  // Reiniciar la página al cambiar la búsqueda o los filtros
  useEffect(() => {
    setCurrentSheet(0)
  }, [search, saleOnly, tradeOnly])

  const hasActiveFilters = search.trim() !== '' || saleOnly || tradeOnly
  const sheets = groupIntoSheets(filteredCards)
  // Sin filtros: siempre mostramos una hoja vacía al final para poder agregar
  if (sheets.length === 0 && !hasActiveFilters) sheets.push([])

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
      setMessage(
        data.cards === 0
          ? `Todos los precios ya estaban al día (${data.skipped ?? 0} cartas).`
          : `Precios actualizados: ${data.cards} cartas, ${data.withPrice} con precio.` +
            (data.fromCache > 0 ? ` ${data.fromCache} desde caché.` : '') +
            (data.skipped > 0 ? ` ${data.skipped} ya estaban al día.` : '')
      )
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white">Profesor TCG</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-400">{binder?.title ?? '—'}</span>
            <span className="text-slate-700">•</span>
            <span>
              {totalCards} cartas en {sheets.length} hoja{sheets.length !== 1 ? 's' : ''}
            </span>
            {user?.email && (
              <>
                <span className="text-slate-700">•</span>
                <span className="truncate text-slate-500">{user.email}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de carpeta + crear */}
          <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 pr-1">
            <FolderIcon className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
            <select
              value={binder?.id ?? ''}
              onChange={(e) => e.target.value && selectBinder(e.target.value)}
              className="h-full max-w-[10rem] bg-transparent pl-1.5 pr-1 text-sm font-medium text-slate-200 focus:outline-none"
            >
              {binders.length === 0 && <option value="">Sin binder</option>}
              {binders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSettingsModal('create')}
              className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              aria-label="Crear carpeta nueva"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>

          <span className="hidden h-6 w-px bg-slate-800 md:block" aria-hidden="true" />

          {/* Acciones de la carpeta actual */}
          {binder && (
            <>
              <button
                onClick={() => setSettingsModal('edit')}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
              >
                <GearIcon className="h-4 w-4" />
                <span className="hidden lg:inline">Configurar</span>
              </button>

              <button
                onClick={togglePublic}
                className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  binder.is_public
                    ? 'bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                aria-label={binder.is_public ? 'Binder público' : 'Binder privado'}
              >
                {binder.is_public ? (
                  <GlobeIcon className="h-4 w-4" />
                ) : (
                  <LockIcon className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">{binder.is_public ? 'Público' : 'Privado'}</span>
              </button>

              <button
                onClick={copyShareLink}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-binder-accent px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
              >
                <ShareIcon className="h-4 w-4" />
                <span className="hidden lg:inline">Compartir</span>
              </button>

              <button
                onClick={handleDeleteBinder}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-600/80 hover:text-white"
                aria-label="Eliminar carpeta"
              >
                <TrashIcon className="h-4 w-4" />
                <span className="hidden lg:inline">Eliminar</span>
              </button>
            </>
          )}

          <span className="hidden h-6 w-px bg-slate-800 md:block" aria-hidden="true" />

          {/* Navegación */}
          <a
            href="/explore"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <CompassIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Explorar</span>
          </a>

          <a
            href="/offers"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <SwapIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Ofertas</span>
          </a>

          <span className="hidden h-6 w-px bg-slate-800 md:block" aria-hidden="true" />

          {/* Cuenta */}
          <button
            onClick={updatePrices}
            disabled={updating || totalCards === 0}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshIcon className="h-4 w-4" />
            <span className="hidden lg:inline">{updating ? 'Actualizando…' : 'Precios'}</span>
          </button>

          {profile?.is_admin && (
            <a
              href="/admin"
              className="flex h-10 items-center gap-1.5 rounded-xl bg-violet-600/15 px-3 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-600/30"
            >
              <ShieldIcon className="h-4 w-4" />
              <span className="hidden lg:inline">Admin</span>
            </a>
          )}

          <button
            onClick={() => {
              if (!profile) loadProfile()
              setShowProfile(true)
            }}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <UserIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Perfil</span>
          </button>

          <button
            onClick={logout}
            className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-600/15 hover:text-red-300"
          >
            <LogoutIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Salir</span>
          </button>
        </div>
      </header>

      <div className="mb-6">
        <ProfileHeaderStats
          totalCards={totalCards}
          totalValue={totalValue}
          saleCount={saleCount}
          tradeCount={tradeCount}
        />
      </div>

      {/* Aviso: cartas en venta/cambio con binder privado. Las cartas igual
          aparecen en el marketplace como publicación individual; el binder
          completo solo se ve si es público. */}
      {binder && !binder.is_public && cards.some((c) => c.is_for_sale || c.is_for_trade) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm leading-relaxed text-amber-200">
            <strong>
              {cards.filter((c) => c.is_for_sale || c.is_for_trade).length}{" "}
              carta{cards.filter((c) => c.is_for_sale || c.is_for_trade).length !== 1 ? 's' : ''}{" "}
              en venta/cambio
            </strong>{' '}
            aparecen en el marketplace como publicación individual, pero tu binder completo es
            privado: solo quienes tengan el link pueden ver la colección.
          </p>
          <button
            onClick={togglePublic}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400"
          >
            <GlobeIcon width={15} height={15} />
            Hacer público el binder
          </button>
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando binder…</p>
      ) : (
        <>
          <BinderToolbar
            search={search}
            onSearchChange={setSearch}
            saleOnly={saleOnly}
            onToggleSale={() => setSaleOnly((v) => !v)}
            tradeOnly={tradeOnly}
            onToggleTrade={() => setTradeOnly((v) => !v)}
            pageCount={sheetPageCount(sheets.length)}
            currentPage={currentSheet}
            onJumpPage={(n) =>
              setCurrentSheet(Math.min(sheetPageCount(sheets.length) - 1, Math.max(0, n - 1)))
            }
            shownCount={filteredCards.length}
            totalCount={totalCards}
          />

          {filteredCards.length === 0 && hasActiveFilters ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-white">Sin resultados</p>
              <p className="mt-1 text-sm text-slate-500">
                Ninguna carta coincide con la búsqueda o los filtros.
              </p>
            </div>
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
                      onRemoveSlot={removeSlot}
                      onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
                      onEditCard={setEditCard}
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

      {showProfile && (
        <ProfileSettings
          profile={profile}
          onSaved={(p) => {
            setProfile(p)
            setShowProfile(false)
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {editCard && (
        <EditCardModal
          card={editCard}
          profile={profile}
          onRequireProfile={setRequireProfileFor}
          onSaved={() => {
            setMessage(`"${editCard.card_name}" actualizada.`)
            setEditCard(null)
            loadBinder()
          }}
          onClose={() => setEditCard(null)}
        />
      )}

      {requireProfileFor && editCard && (
        <ProfileRequiredModal
          cardName={editCard.card_name}
          onComplete={(p) => {
            setProfile(p)
            setRequireProfileFor(null)
          }}
          onClose={() => setRequireProfileFor(null)}
        />
      )}

      {settingsModal && (
        <BinderSettingsModal
          binder={settingsModal === 'edit' ? binder : null}
          cards={cards}
          onSave={async (values) => {
            if (settingsModal === 'create') {
              await handleSaveBinder(values)
            } else {
              await handleUpdateBinder(values)
            }
            setSettingsModal(null)
          }}
          onClose={() => setSettingsModal(null)}
        />
      )}
    </div>
  )
}