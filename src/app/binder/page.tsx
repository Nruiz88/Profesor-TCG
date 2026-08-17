'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import SiteNav from '@/components/SiteNav'
import BinderSidebar from '@/components/BinderSidebar'
import BinderSheet from '@/components/BinderSheet'
import SheetPagination from '@/components/SheetPagination'
import SlotSearchModal, { type SearchResult } from '@/components/SlotSearchModal'
import type { CardLanguage } from '@/lib/cardLanguage'
import ProfileSettings from '@/components/ProfileSettings'
import ProfileRequiredModal from '@/components/ProfileRequiredModal'
import EditCardModal from '@/components/EditCardModal'
import BinderSettingsModal from '@/components/BinderSettingsModal'
import BinderToolbar from '@/components/BinderToolbar'
import BinderTabs, { type BinderTab } from '@/components/binder/BinderTabs'
import WantlistSlot from '@/components/binder/WantlistSlot'
import ProfileHeaderStats from '@/components/ProfileHeaderStats'
import ClaimsPanel from '@/components/ClaimsPanel'
import SellerReputationCard from '@/components/SellerReputationCard'
import { GlobeIcon, LockIcon, PlusIcon, SparklesIcon } from '@/components/icons'
import type { WantlistCard } from '@/types/wantlist'
import { createClient } from '@/lib/supabase/client'
import { createBinder, deleteBinder, getUserBinders } from '@/lib/binders'
import type { Profile } from '@/lib/profile'
import { effectivePrice, type Availability } from '@/lib/cardStatus'
import {
  SLOTS_PER_SHEET,
  findNextEmptySlot,
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
  const [saleOnly, setSaleOnly] = useState(false)
  const [tradeOnly, setTradeOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [settingsModal, setSettingsModal] = useState<'create' | 'edit' | null>(null)
  const [showClaims, setShowClaims] = useState(false)
  const [tab, setTab] = useState<BinderTab>('collection')
  const [wantlist, setWantlist] = useState<WantlistCard[]>([])
  const [wantlistLoading, setWantlistLoading] = useState(false)
  const [showWantlistSearch, setShowWantlistSearch] = useState(false)

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

  const loadWantlist = useCallback(async () => {
    setWantlistLoading(true)
    try {
      const res = await fetch('/api/wantlist')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setWantlist(data.wantlist || [])
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al cargar tus buscadas')
    } finally {
      setWantlistLoading(false)
    }
  }, [])

  async function addToWantlist(card: SearchResult) {
    const res = await fetch('/api/wantlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: card.id,
        card_name: card.name,
        set_id: card.set_id,
        set_name: card.set_name,
        number: card.number
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar en buscadas')
    setMessage(`"${card.name}" agregada a tus Cartas Buscadas.`)
    await loadWantlist()
  }

  async function removeFromWantlist(id: string) {
    try {
      const res = await fetch(`/api/wantlist/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadWantlist()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al quitar carta de buscadas')
    }
  }

  async function updateWantlistBudget(id: string, maxBudget: number | null) {
    try {
      const res = await fetch(`/api/wantlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_budget: maxBudget })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadWantlist()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al actualizar el presupuesto')
    }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u ? { email: u.email, id: u.id } : null)
      if (u) loadBinders(u.id)
    })
    loadBinder()
    loadProfile()
    loadWantlist()
  }, [loadBinder, loadBinders, loadProfile, loadWantlist])

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

  // Filtros del visor (disponibilidad + tipo) — client-side, sin refetch.
  // El buscador del toolbar ya no filtra el binder: busca en el catálogo
  // completo y agrega directo al bolsillo vacío más próximo.
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (saleOnly && !c.is_for_sale) return false
      if (tradeOnly && !c.is_for_trade) return false
      if (typeFilter && !(c.types ?? []).includes(typeFilter)) return false
      return true
    })
  }, [cards, saleOnly, tradeOnly, typeFilter])

  // Reiniciar la página al cambiar los filtros
  useEffect(() => {
    setCurrentSheet(0)
  }, [saleOnly, tradeOnly, typeFilter])

  const hasActiveFilters = saleOnly || tradeOnly || typeFilter !== null
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

  async function addCardToSlot(card: SearchResult, language: CardLanguage) {
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
        number: card.number,
        language
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar carta')
    await loadBinder()
  }

  // Agrega la carta al bolsillo vacío más próximo (primer slot libre).
  // Es el flujo principal: el buscador del toolbar agrega sin tener que
  // elegir un bolsillo primero.
  async function addCardToNearestSlot(card: SearchResult, language: CardLanguage) {
    if (!binder) throw new Error('Sin binder')

    const slotNumber = findNextEmptySlot(cards)
    const res = await fetch('/api/binder/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        binder_id: binder.id,
        slot_number: slotNumber,
        card_id: card.id,
        card_name: card.name,
        set_id: card.set_id,
        number: card.number,
        language
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al guardar carta')
    await loadBinder()
    setMessage(`"${card.name}" agregada a tu binder en el bolsillo #${slotNumber}.`)
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <SiteNav active="binder" />

      <div className="mx-auto w-full max-w-7xl px-4 py-4 lg:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Panel lateral: perfil, colecciones, acciones y herramientas */}
          <div className="w-full lg:w-[17rem] lg:shrink-0">
            <BinderSidebar
              profile={profile}
              user={user}
              binders={binders}
              activeBinderId={activeBinderId}
              binder={binder}
              totalCards={totalCards}
              totalValue={totalValue}
              saleCount={saleCount}
              tradeCount={tradeCount}
              updating={updating}
              onSelectBinder={selectBinder}
              onCreateBinder={() => setSettingsModal('create')}
              onEditBinder={() => setSettingsModal('edit')}
              onTogglePublic={togglePublic}
              onCopyShareLink={copyShareLink}
              onDeleteBinder={handleDeleteBinder}
              onRefreshPrices={updatePrices}
              onShowClaims={() => setShowClaims(true)}
              onShowProfile={() => {
                if (!profile) loadProfile()
                setShowProfile(true)
              }}
            />
          </div>

          {/* Contenido principal */}
          <main className="min-w-0 flex-1">
            <div className="mb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {binder?.title ?? 'Mi Binder'}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                {binder?.description && <span>{binder.description}</span>}
                <span className="font-medium text-slate-400">
                  {totalCards} carta{totalCards !== 1 ? 's' : ''}
                </span>
                <span className="text-slate-700">•</span>
                <span>
                  {sheets.length} hoja{sheets.length !== 1 ? 's' : ''}
                </span>
                {binder && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      binder.is_public
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {binder.is_public ? (
                      <GlobeIcon className="h-3 w-3" />
                    ) : (
                      <LockIcon className="h-3 w-3" />
                    )}
                    {binder.is_public ? 'Público' : 'Privado'}
                  </span>
                )}
              </p>
            </div>

            <div className="mb-6">
        <ProfileHeaderStats
          totalCards={totalCards}
          totalValue={totalValue}
          saleCount={saleCount}
          tradeCount={tradeCount}
        />
      </div>

      <div className="mb-6">
        <BinderTabs active={tab} onChange={setTab} wantlistCount={wantlist.length} />
      </div>

      {/* Reputación propia: rating, reseñas, claims y badge (misma ficha que ven los demás) */}
      {profile?.username && <SellerReputationCard username={profile.username} className="mb-6" />}

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
      ) : tab === 'wantlist' ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-fuchsia-200">
                {wantlist.length} carta{wantlist.length !== 1 ? 's' : ''} en tu lista de buscadas
              </p>
              <p className="text-xs text-slate-400">
                Quien tenga estas cartas puede ofrecerte un Swap directo por WhatsApp.
              </p>
            </div>
            <button
              onClick={() => setShowWantlistSearch(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
            >
              <PlusIcon width={15} height={15} />
              Agregar carta buscada
            </button>
          </div>

          {wantlistLoading ? (
            <p className="py-16 text-center text-slate-500">Cargando buscadas…</p>
          ) : wantlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-fuchsia-500/40 bg-slate-900 px-6 py-16 text-center">
              <SparklesIcon className="mx-auto h-8 w-8 text-fuchsia-400" />
              <p className="mt-3 text-lg font-semibold text-white">Tu lista de buscadas está vacía</p>
              <p className="mt-1 text-sm text-slate-500">
                Agregá las cartas que estás buscando para que otros coleccionistas puedan
                ofrecerte un Swap por WhatsApp.
              </p>
              <button
                onClick={() => setShowWantlistSearch(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
              >
                <PlusIcon width={15} height={15} />
                Agregar carta buscada
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {wantlist.map((w) => (
                <WantlistSlot
                  key={w.id}
                  entry={w}
                  owner
                  onRemove={removeFromWantlist}
                  onBudgetChange={updateWantlistBudget}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <BinderToolbar
            saleOnly={saleOnly}
            onToggleSale={() => setSaleOnly((v) => !v)}
            tradeOnly={tradeOnly}
            onToggleTrade={() => setTradeOnly((v) => !v)}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            pageCount={sheetPageCount(sheets.length)}
            currentPage={currentSheet}
            onJumpPage={(n) =>
              setCurrentSheet(Math.min(sheetPageCount(sheets.length) - 1, Math.max(0, n - 1)))
            }
            shownCount={filteredCards.length}
            totalCount={totalCards}
            onAddCard={addCardToNearestSlot}
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
                      onCardUpdated={() => loadBinder()}
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
          onSelect={async (card, language) => {
            await addCardToSlot(card, language)
            setSlotTarget(null)
          }}
        />
      )}

      {showWantlistSearch && (
        <SlotSearchModal
          slotLabel="a buscar"
          onClose={() => setShowWantlistSearch(false)}
          onSelect={async (card) => {
            try {
              await addToWantlist(card)
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'Error al agregar a buscadas')
            }
            setShowWantlistSearch(false)
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
          onRefresh={() => loadBinder()}
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

      {showClaims && <ClaimsPanel onClose={() => setShowClaims(false)} />}
          </main>
        </div>
      </div>
    </div>
  )
}