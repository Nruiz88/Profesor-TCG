'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveNav from '@/components/ResponsiveNav'
import SheetPagination from '@/components/SheetPagination'
import PokedexSearchModal from '@/components/PokedexSearchModal'
import type { SearchResult } from '@/types'
import type { CardLanguage } from '@/lib/cardLanguage'
import ProfileRequiredModal from '@/components/ProfileRequiredModal'
import BinderShareModal from '@/components/BinderShareModal'
import EditCardModal from '@/components/EditCardModal'
import BinderSettingsModal from '@/components/BinderSettingsModal'
import BinderToolbar from '@/components/BinderToolbar'
import BinderTabs, { type BinderTab } from '@/components/binder/BinderTabs'
import WantlistSlot from '@/components/binder/WantlistSlot'
import dynamic from 'next/dynamic'
import ClaimsPanel from '@/components/ClaimsPanel'
import ReservedClaimsBanner from '@/components/ReservedClaimsBanner'
import SellerReputationCard from '@/components/SellerReputationCard'
import {
  ChatIcon,
  ChevronDownIcon,
  GearIcon,
  GlobeIcon,
  LockIcon,
  PlusIcon,
  ShareIcon,
  SparklesIcon,
  TrashIcon
} from '@/components/icons'
import type { WantlistCard } from '@/types/wantlist'
import { createClient } from '@/lib/supabase/client'
import { createBinder, deleteBinder, getUserBinders } from '@/lib/binders'
import { completeSaleAction } from '@/app/actions/claims'
import { fetchJson } from '@/lib/utils'
import type { Profile } from '@/lib/profile'
import { effectivePrice, type Availability } from '@/lib/cardStatus'
import type { Currency } from '@/lib/priceGuide'
import type { CardCondition } from '@/lib/cardCondition'

const EditableBinderGrid = dynamic(() => import('@/components/binder/EditableBinderGrid'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-[63/88] animate-pulse rounded-xl bg-slate-800/50" />
        ))}
      </div>
    </div>
  )
})
import {
  SLOTS_PER_SHEET,
  findNextEmptySlot,
  groupIntoSheets,
  padSheet,
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
  const [showPokedex, setShowPokedex] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<(SlotCard | null)[] | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [showShareImage, setShowShareImage] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!shareOpen) return
    function onDocClick(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setShareOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [shareOpen])

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

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (res.ok && data.profile) {
        setProfile(data.profile)
        return data.profile
      }
    } catch {
      // perfil no disponible
    }
    return null
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

  async function updateWantlistCurrency(id: string, currency: Currency) {
    try {
      const res = await fetch(`/api/wantlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadWantlist()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al actualizar la moneda')
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

  // Asegura que el binder sea público y devuelve su link base /binder/[username].
  async function ensurePublicBinder(): Promise<string | null> {
    if (!binder || !profile?.username) return null
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
    return `${window.location.origin}/binder/${encodeURIComponent(profile.username)}`
  }

  async function copyLink(url: string, message: string) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage(message)
    } catch {
      window.prompt('Copiá el link:', url)
    }
  }

  async function copyShareLink() {
    const url = await ensurePublicBinder()
    if (!url) return
    await copyLink(url, 'Link copiado al portapapeles. El binder ahora es público.')
  }

  // Compartir el binder de buscados: link que aterriza en la pestaña
  // wantlist (su preview OG ya muestra cuántas cartas busca el dueño).
  async function copyWantlistLink() {
    const base = await ensurePublicBinder()
    if (!base) return
    await copyLink(`${base}?tab=wantlist`, 'Link de buscadas copiado. El binder ahora es público.')
  }

  // Compartir binder por WhatsApp: abre WhatsApp con mensaje prellenado
  async function shareBinderWhatsApp() {
    const url = await ensurePublicBinder()
    if (!url) return
    const phone = profile?.whatsapp_number
    if (!phone) {
      setMessage('No tenés número de WhatsApp configurado en tu perfil.')
      return
    }
    const text = encodeURIComponent(
      `¡Mira mi colección de Pokémon! 🃏\n\n` +
      `${binder?.title ?? 'Mi Binder'} — ${totalCards} cartas\n` +
      `${url}`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  // Compartir wantlist por WhatsApp
  async function shareWantlistWhatsApp() {
    const base = await ensurePublicBinder()
    if (!base) return
    const text = encodeURIComponent(
      `¡Estoy buscando estas cartas de Pokémon! ✨\n\n` +
      `Busco ${wantlist.length} carta${wantlist.length !== 1 ? 's' : ''}\n` +
      `${base}?tab=wantlist`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  // Estadísticas del perfil (sobre todas las cartas, sin filtros)
  const totalCards = cards.length
  const saleCount = cards.filter((c) => c.is_for_sale).length
  const tradeCount = cards.filter((c) => c.is_for_trade).length
  const totalValue = cards.reduce(
    (sum, c) => sum + (effectivePrice(c.market_price, c.price_override, c.price) ?? 0),
    0
  )
  const fmtValue = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

  function handleReorder(sheetIndex: number, newSlots: (SlotCard | null)[]) {
    setPendingOrder(newSlots)
    setHasUnsavedChanges(true)
    // Actualizar las hojas en estado local para feedback inmediato
    setCards((prev) => {
      const updated = [...prev]
      for (let i = 0; i < newSlots.length; i++) {
        const slotNumber = sheetIndex * SLOTS_PER_SHEET + i + 1
        if (newSlots[i]) {
          updated.push({ ...newSlots[i]!, slot_number: slotNumber })
        }
      }
      // Quitar las cartas que estaban en esa hoja y re-agregar con nuevos números
      const baseSlot = sheetIndex * SLOTS_PER_SHEET + 1
      const withoutSheet = updated.filter(
        (c) => c.slot_number < baseSlot || c.slot_number >= baseSlot + SLOTS_PER_SHEET
      )
      const reordered = newSlots
        .map((s, i) => (s ? { ...s, slot_number: baseSlot + i } : null))
        .filter(Boolean) as SlotCard[]
      return [...withoutSheet, ...reordered]
    })
  }

  async function saveOrder() {
    if (!binder || !pendingOrder) return
    setMessage(null)
    try {
      // Actualizar slot_number de cada carta en el binder
      const updates = pendingOrder
        .map((s, i) => {
          if (!s) return null
          return fetch(`/api/binder/slots/${s.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slot_number: s.slot_number })
          })
        })
        .filter(Boolean)
      await Promise.all(updates)
      setHasUnsavedChanges(false)
      setPendingOrder(null)
      await loadBinder()
      setMessage('Orden guardado.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al guardar el orden')
    }
  }

  function cancelEdit() {
    setIsEditing(false)
    setHasUnsavedChanges(false)
    setPendingOrder(null)
    loadBinder()
  }

  // Toggle carta destacada (máximo 4 en el perfil)
  async function handleToggleFeatured(cardId: string, isFeatured: boolean) {
    try {
      const res = await fetch(`/api/binder/slots/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: isFeatured })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      // Actualizar estado local
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, is_featured: isFeatured } : c))
      )
      setMessage(
        isFeatured
          ? '⭐ Carta destacada en tu perfil.'
          : 'Carta quitada de destacadas.'
      )
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error al destacar carta')
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

  // Cierre de venta: el vendedor marca la carta reservada como vendida. Sale de
  // circulación, se completa el claim y ambas partes pueden calificarse.
  async function markCardSold(cardId: string) {
    const res = await completeSaleAction({ cardId })
    if (!res.ok) {
      setMessage(res.error)
      return
    }
    await loadBinder()
    setMessage(
      res.completedClaims > 0
        ? 'Carta marcada como vendida. La transacción quedó cerrada: podés calificar a la otra parte desde Mis transacciones.'
        : 'Carta marcada como vendida y quitada de la venta.'
    )
  }

  async function addCardToSlot(
    card: SearchResult,
    language: CardLanguage,
    condition?: CardCondition | '',
    variant?: string
  ) {
    if (!binder || !slotTarget) throw new Error('Sin binder o slot objetivo')

    const slotNumber = slotTarget.sheetIndex * SLOTS_PER_SHEET + slotTarget.slotIndex + 1

    await fetchJson('/api/binder/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        binder_id: binder.id,
        slot_number: slotNumber,
        card_id: card.id,
        card_name: card.name,
        set_id: card.set_id,
        number: card.number,
        language,
        condition: condition || null,
        variant: variant || 'normal'
      })
    })
    await loadBinder()
  }

  // Agrega la carta al bolsillo vacío más próximo (primer slot libre).
  // Es el flujo principal: el buscador del toolbar agrega sin tener que
  // elegir un bolsillo primero.
  async function addCardToNearestSlot(
    card: SearchResult,
    language: CardLanguage,
    condition?: CardCondition | '',
    variant?: string
  ) {
    if (!binder) throw new Error('Sin binder')

    const slotNumber = findNextEmptySlot(cards)
    await fetchJson('/api/binder/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        binder_id: binder.id,
        slot_number: slotNumber,
        card_id: card.id,
        card_name: card.name,
        set_id: card.set_id,
        number: card.number,
        language,
        condition: condition || null,
        variant: variant || 'normal'
      })
    })
    await loadBinder()
    setMessage(`"${card.name}" agregada a tu binder en el bolsillo #${slotNumber}.`)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowPokedex(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <ResponsiveNav
        profile={profile}
        user={user}
        binders={binders}
        activeBinderId={activeBinderId}
        onSelectBinder={selectBinder}
        onCreateBinder={() => setSettingsModal('create')}
        onRefreshPrices={updatePrices}
        updating={updating}
        onShowProfile={async () => {
          const p = profile ?? (await loadProfile())
          if (p?.username) {
            router.push(`/profile/${encodeURIComponent(p.username)}?tab=settings`)
          } else {
            setMessage('No se pudo abrir tu perfil. Intentalo de nuevo.')
          }
        }}
        onShowClaims={() => setShowClaims(true)}
      />

      <div className="pb-20 lg:pb-0 lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 py-4 lg:py-8">
            {/* Header compacto: título + stats inline + acciones */}
            <div className="mb-5 rounded-2xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight text-white">
                      {binder?.title ?? 'Mi Binder'}
                    </h1>
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
                  </div>
                  {/* Stats inline — sin cards separadas */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{totalCards} carta{totalCards !== 1 ? 's' : ''}</span>
                    <span className="text-slate-700">·</span>
                    <span className="font-semibold text-yellow-400/90">${fmtValue(totalValue)} USD</span>
                    {saleCount > 0 && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-emerald-400">{saleCount} en venta</span>
                      </>
                    )}
                    {tradeCount > 0 && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span className="text-sky-400">{tradeCount} cambio</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {/* Compartir dropdown */}
                  <div className="relative" ref={shareMenuRef}>
                    <button
                      onClick={() => setShareOpen((v) => !v)}
                      aria-expanded={shareOpen}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
                    >
                      <ShareIcon className="h-4 w-4" />
                      Compartir
                      <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${shareOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {shareOpen && (
                      <div className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-slate-800 bg-slate-950/95 p-1 shadow-2xl shadow-black/60 backdrop-blur-xl">
                        <button
                          onClick={() => { setShareOpen(false); copyShareLink() }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <ShareIcon className="h-3.5 w-3.5 text-slate-500" /> Copiar link
                        </button>
                        {profile?.whatsapp_number && (
                          <button
                            onClick={() => { setShareOpen(false); shareBinderWhatsApp() }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            <ChatIcon className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp binder
                          </button>
                        )}
                        <div className="my-0.5 h-px bg-slate-800" />
                        <button
                          onClick={() => { setShareOpen(false); copyWantlistLink() }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          <ShareIcon className="h-3.5 w-3.5 text-fuchsia-400" /> Copiar buscadas
                        </button>
                        {profile?.whatsapp_number && (
                          <button
                            onClick={() => { setShareOpen(false); shareWantlistWhatsApp() }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                          >
                            <ChatIcon className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp buscadas
                          </button>
                        )}
                        <div className="my-0.5 h-px bg-slate-800" />
                        <button
                          onClick={() => { setShareOpen(false); setShowShareImage(true) }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                        >
                          🖼️ Imagen del binder
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={togglePublic}
                    disabled={!binder}
                    title={binder?.is_public ? 'Hacer privado' : 'Hacer público'}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
                  >
                    {binder?.is_public ? (
                      <GlobeIcon className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <LockIcon className="h-3.5 w-3.5" />
                    )}
                    {binder?.is_public ? 'Público' : 'Privado'}
                  </button>
                  <button
                    onClick={() => setSettingsModal('edit')}
                    disabled={!binder}
                    title="Configurar binder"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-40"
                  >
                    <GearIcon className="h-3.5 w-3.5" />
                  </button>
                  {binder && (
                    <button
                      onClick={handleDeleteBinder}
                      title="Eliminar binder"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-500 transition-colors hover:border-red-500/40 hover:text-red-400"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-6">
        <BinderTabs active={tab} onChange={setTab} wantlistCount={wantlist.length} />
      </div>



      {/* Reservas activas: cartas del binder tomadas por claims (soft lock 24h) */}
      <ReservedClaimsBanner cards={cards} onShowClaims={() => setShowClaims(true)} />

      {/* Aviso sutil: binder privado con cartas publicadas */}
      {binder && !binder.is_public && cards.some((c) => c.is_for_sale || c.is_for_trade) && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-300/80">
            {cards.filter((c) => c.is_for_sale || c.is_for_trade).length} carta{cards.filter((c) => c.is_for_sale || c.is_for_trade).length !== 1 ? 's' : ''} en marketplace · binder privado
          </p>
          <button
            onClick={togglePublic}
            className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            Hacer público
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyWantlistLink}
                className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
              >
                <ShareIcon className="h-4 w-4" />
                Compartir buscadas
              </button>
              <button
                onClick={() => setShowWantlistSearch(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600"
              >
                <PlusIcon width={15} height={15} />
                Agregar carta buscada
              </button>
            </div>
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
                  onCurrencyChange={updateWantlistCurrency}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <BinderToolbar
              saleOnly={saleOnly}
              onToggleSale={() => setSaleOnly((v) => !v)}
              tradeOnly={tradeOnly}
              onToggleTrade={() => setTradeOnly((v) => !v)}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              shownCount={filteredCards.length}
              totalCount={totalCards}
              onOpenSearch={() => setShowPokedex(true)}
            />
            <button
              onClick={() => {
                if (isEditing) {
                  cancelEdit()
                } else {
                  setIsEditing(true)
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${
                isEditing
                  ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-900/40 hover:bg-fuchsia-400'
                  : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'
              }`}
            >
              {isEditing ? '✋ Terminar edición' : '✏️ Editar orden'}
            </button>
          </div>

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
                  const currentSlots = sheetCards ? padSheet(sheetCards) : Array(9).fill(null)
                  return (
                    <EditableBinderGrid
                      key={sheetIndex}
                      sheetNumber={sheetIndex + 1}
                      slots={currentSlots}
                      isEditing={isEditing}
                      onRemoveSlot={removeSlot}
                      onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
                      onEditCard={setEditCard}
                      onMarkSold={markCardSold}
                      onCardUpdated={() => loadBinder()}
                      onReorder={(newSlots) => handleReorder(sheetIndex, newSlots)}
                      onToggleFeatured={handleToggleFeatured}
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
        <PokedexSearchModal
          title="Agregar al bolsillo elegido"
          onClose={() => setSlotTarget(null)}
          onSelect={async (card, language, condition, variant) => {
            await addCardToSlot(card, language, condition, variant)
            setSlotTarget(null)
          }}
        />
      )}

      {showWantlistSearch && (
        <PokedexSearchModal
          title="Pokédex · Agregar a buscadas"
          showCondition={false}
          onClose={() => setShowWantlistSearch(false)}
          onSelect={async (card) => {
            try {
              await addToWantlist(card)
            } catch (err) {
              setMessage(err instanceof Error ? err.message : 'Error al agregar a buscadas')
              throw err
            }
            setShowWantlistSearch(false)
          }}
        />
      )}

      {showPokedex && (
        <PokedexSearchModal
          onClose={() => setShowPokedex(false)}
          onSelect={async (card, language, condition, variant) => {
            await addCardToNearestSlot(card, language, condition, variant)
            setShowPokedex(false)
          }}
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

      {/* Banner flotante: cambios sin guardar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-fuchsia-500/50 bg-slate-900/95 px-5 py-3 shadow-[0_0_30px_rgba(217,70,239,0.3)] backdrop-blur-xl">
          <span className="text-sm font-semibold text-fuchsia-200">
            Tenés cambios sin guardar
          </span>
          <button
            onClick={saveOrder}
            className="rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-fuchsia-400"
          >
            Guardar Orden
          </button>
          <button
            onClick={cancelEdit}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white"
          >
            Cancelar
          </button>
        </div>
      )}

      {showClaims && <ClaimsPanel onClose={() => setShowClaims(false)} />}

      {showShareImage && profile?.username && (
        <BinderShareModal
          binderTitle={binder?.title ?? 'Mi Binder'}
          cards={cards}
          username={profile.username}
          binderUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/binder/${encodeURIComponent(profile.username)}`}
          onClose={() => setShowShareImage(false)}
        />
      )}
          </main>
        </div>
    </div>
  )
}