'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResponsiveNav from '@/components/ResponsiveNav'
import type { SearchResult } from '@/types'
import type { CardLanguage } from '@/lib/cardLanguage'
import dynamic from 'next/dynamic'
import BinderProfileHeader from '@/components/binder/BinderProfileHeader'
import BinderSidebar from '@/components/binder/BinderSidebar'
import BinderContent from '@/components/binder/BinderContent'
import { createClient } from '@/lib/supabase/client'
import { createBinder, deleteBinder, getUserBinders } from '@/lib/binders'
import { completeSaleAction } from '@/app/actions/claims'
import { fetchJson } from '@/lib/utils'
import type { Profile } from '@/lib/profile'
import type { WantlistCard } from '@/types/wantlist'
import { effectivePrice, type Availability } from '@/lib/cardStatus'
import type { Currency } from '@/lib/priceGuide'
import type { CardCondition } from '@/lib/cardCondition'
import { type TrainerScore } from '@/lib/trainer'

const BinderGallery = dynamic(() => import('@/components/binder/BinderGallery'), {
  ssr: false
})
const PokedexSearchModal = dynamic(() => import('@/components/PokedexSearchModal'), {
  ssr: false
})
const ProfileRequiredModal = dynamic(() => import('@/components/ProfileRequiredModal'), {
  ssr: false
})
const BinderShareModal = dynamic(() => import('@/components/BinderShareModal'), {
  ssr: false
})
const EditCardModal = dynamic(() => import('@/components/EditCardModal'), {
  ssr: false
})
const BinderSettingsModal = dynamic(() => import('@/components/BinderSettingsModal'), {
  ssr: false
})

import {
  SLOTS_PER_SHEET,
  findNextEmptySlot,
  groupIntoSheets,
  padSheet,
  toSlotCard,
  type SlotCard
} from '@/lib/sheets'

export interface Binder {
  id: string
  title: string
  description?: string | null
  is_public?: boolean
  cover_card_id?: string | null
  slug?: string | null
  background?: string | null
  created_at?: string
}

export default function BinderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const binderIdFromUrl = searchParams.get('binderId')
  const isGallery = !binderIdFromUrl

  const [user, setUser] = useState<{ email: string | undefined; id: string } | null>(null)
  const [binders, setBinders] = useState<Binder[]>([])
  const [binder, setBinder] = useState<Binder | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingPriceId, setFetchingPriceId] = useState<string | null>(null)
  const [slotTarget, setSlotTarget] = useState<{ sheetIndex: number; slotIndex: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [activeBinderId, setActiveBinderId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editCard, setEditCard] = useState<SlotCard | null>(null)
  const [requireProfileFor, setRequireProfileFor] = useState<Availability | null>(null)
  const [query, setQuery] = useState('')
  const [settingsModal, setSettingsModal] = useState<'create' | 'edit' | null>(null)
  const [tab, setTab] = useState<'collection' | 'wantlist'>('collection')
  const [wantlist, setWantlist] = useState<WantlistCard[]>([])
  const [wantlistLoading, setWantlistLoading] = useState(false)
  const [showWantlistSearch, setShowWantlistSearch] = useState(false)
  const [showPokedex, setShowPokedex] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [pendingOrder, setPendingOrder] = useState<(SlotCard | null)[] | null>(null)
  const [showShareImage, setShowShareImage] = useState(false)
  const [shareBinderUrl, setShareBinderUrl] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [trainerScore, setTrainerScore] = useState<TrainerScore | null>(null)

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
    } catch { /* se reporta via message en loadBinder */ }
  }, [])

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (res.ok && data.profile) {
        setProfile(data.profile)
        if (data.profile.is_verified) setIsVerified(true)
        if (data.profile.is_premium) setIsPremium(true)
        return data.profile
      }
    } catch { /* perfil no disponible */ }
    return null
  }, [])

  const loadPokedex = useCallback(async () => {
    try {
      const res = await fetch('/api/pokedex')
      const data = await res.json()
      if (res.ok && data.trainer) {
        setTrainerScore(data.trainer)
      }
    } catch { /* pokedex no disponible */ }
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
    } finally { setWantlistLoading(false) }
  }, [])

  async function addToWantlist(card: SearchResult) {
    const res = await fetch('/api/wantlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, card_name: card.name, set_id: card.set_id, set_name: card.set_name, number: card.number })
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
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al quitar carta de buscadas') }
  }

  async function updateWantlistBudget(id: string, maxBudget: number | null) {
    try {
      const res = await fetch(`/api/wantlist/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max_budget: maxBudget })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadWantlist()
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al actualizar el presupuesto') }
  }

  async function updateWantlistCurrency(id: string, currency: Currency) {
    try {
      const res = await fetch(`/api/wantlist/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadWantlist()
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al actualizar la moneda') }
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u ? { email: u.email, id: u.id } : null)
      if (u) loadBinders(u.id)
    })
    loadProfile()
    loadWantlist()
  }, [loadBinders, loadProfile, loadWantlist])

  // El puntaje de entrenador (/api/pokedex) es pesado (consulta binders,
  // binder_cards, claims y reviews). Se difiere para no bloquear el paint
  // inicial del binder: se dispara con rAF para que el render crítico fluya.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const timeout = setTimeout(loadPokedex, 400)
      return () => clearTimeout(timeout)
    })
    return () => cancelAnimationFrame(id)
  }, [loadPokedex])

  const tabFromUrl = searchParams.get('tab')
  useEffect(() => {
    if (tabFromUrl === 'wantlist' || tabFromUrl === 'collection') {
      setTab(tabFromUrl)
    }
  }, [tabFromUrl])

  useEffect(() => {
    if (binderIdFromUrl) {
      setLoading(true)
      setActiveBinderId(binderIdFromUrl)
      setCurrentSheet(0)
      loadBinder(binderIdFromUrl)
    }
  }, [binderIdFromUrl, loadBinder])

  async function selectBinder(binderId: string) {
    router.push(`/binder?binderId=${binderId}`)
  }

  async function handleSaveBinder(values: {
    title: string; description: string | null; isPublic: boolean; coverCardId: string | null; background: string | null
  }) {
    if (!user) return
    setMessage(null)
    const created = await createBinder(user.id, values.title, {
      description: values.description, is_public: values.isPublic, cover_card_id: values.coverCardId, background: values.background
    })
    setBinders((prev) => [...prev, created])
    await selectBinder(created.id)
    setMessage(`Carpeta "${created.title}" creada.`)
  }

  async function handleUpdateBinder(values: {
    title: string; description: string | null; isPublic: boolean; coverCardId: string | null; background: string | null
  }) {
    if (!binder) return
    setMessage(null)
    const res = await fetch('/api/binder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binderId: binder.id, title: values.title, description: values.description, is_public: values.isPublic, cover_card_id: values.coverCardId, background: values.background })
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
        setBinder(null); setCards([])
        router.push('/binder')
      }
      setMessage('Binder eliminado.')
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al eliminar binder') }
  }

  async function togglePublic() {
    if (!binder) return
    setMessage(null)
    try {
      const next = !binder.is_public
      const res = await fetch('/api/binder', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binderId: binder.id, is_public: next })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBinder(data.binder)
      setBinders((prev) => prev.map((b) => (b.id === data.binder.id ? data.binder : b)))
      setMessage(next ? 'Binder público: cualquiera con el link puede verlo.' : 'Binder privado.')
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al actualizar visibilidad') }
  }

  async function ensurePublic(): Promise<Binder | null> {
    if (!binder) return null
    if (binder.is_public) return binder
    const res = await fetch('/api/binder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binderId: binder.id, is_public: true })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error')
    setBinder(data.binder)
    setBinders((prev) => prev.map((b) => (b.id === data.binder.id ? data.binder : b)))
    return data.binder
  }

  async function ensurePublicBinder(): Promise<string | null> {
    const b = await ensurePublic()
    if (!b || !profile?.username) return null
    const base = `${window.location.origin}/binder/${encodeURIComponent(profile.username)}`
    const firstPublic = binders.find((x) => x.is_public || x.id === b.id)
    const isDefault = firstPublic?.id === b.id
    if (isDefault) return base
    return `${base}?binderId=${encodeURIComponent(b.id)}`
  }

  async function ensureWantlistUrl(): Promise<string | null> {
    const b = await ensurePublic()
    if (!b) return null
    return `${window.location.origin}/b/${encodeURIComponent(b.id)}?tab=wantlist`
  }

  async function openShareImage() {
    const url = await ensurePublicBinder()
    if (!url) return
    setShareBinderUrl(url)
    setShowShareImage(true)
  }

  async function copyLink(url: string, msg: string) {
    try { await navigator.clipboard.writeText(url); setMessage(msg) }
    catch { window.prompt('Copiá el link:', url) }
  }

  async function copyShareLink() {
    const url = await ensurePublicBinder()
    if (!url) return
    await copyLink(url, 'Link copiado al portapapeles. El binder ahora es público.')
  }

  async function copyWantlistLink() {
    const url = await ensureWantlistUrl()
    if (!url) return
    await copyLink(url, 'Link de buscadas copiado. El binder ahora es público.')
  }

  async function shareBinderWhatsApp() {
    const url = await ensurePublicBinder()
    if (!url) return
    const phone = profile?.whatsapp_number
    if (!phone) { setMessage('No tenés número de WhatsApp configurado en tu perfil.'); return }
    const text = encodeURIComponent(`¡Mira mi colección de Pokémon! 🃏\n\n${binder?.title ?? 'Mi Binder'} — ${totalCards} cartas\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  async function shareWantlistWhatsApp() {
    const url = await ensureWantlistUrl()
    if (!url) return
    const text = encodeURIComponent(`¡Estoy buscando estas cartas de Pokémon! ✨\n\nBusco ${wantlist.length} carta${wantlist.length !== 1 ? 's' : ''}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const totalCards = useMemo(() => cards.reduce((sum, c) => sum + (c.quantity ?? 1), 0), [cards])
  const saleCount = useMemo(() => cards.filter((c) => c.is_for_sale).length, [cards])
  const tradeCount = useMemo(() => cards.filter((c) => c.is_for_trade).length, [cards])
  const totalValue = useMemo(() => cards.reduce(
    (sum, c) => sum + (effectivePrice(c.market_price, c.price_override, c.price, c.manual_price) ?? 0) * (c.quantity ?? 1), 0
  ), [cards])
  const fmtValue = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const binderSets = useMemo(() => {
    const bySet = new Map<string, number>()
    for (const c of cards) bySet.set(c.set_id, (bySet.get(c.set_id) ?? 0) + (c.quantity ?? 1))
    return [...bySet.entries()].map(([set_id, count]) => ({ set_id, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [cards])

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards
    return cards.filter((c) => `${c.card_name} ${c.set_id} ${c.number}`.toLowerCase().includes(q))
  }, [cards, query])

  useEffect(() => { setCurrentSheet(0) }, [query])

  const sheets = useMemo(() => {
    const res = groupIntoSheets(filteredCards)
    if (res.length === 0 && query.trim() === '') res.push([])
    return res
  }, [filteredCards, query])

  async function fetchCardPrice(card: SlotCard) {
    if (!binder) return
    setFetchingPriceId(card.id); setMessage(null)
    try {
      const res = await fetch('/api/binder/update-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ binderId: binder.id, cardIds: [card.card_id] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      if (data.cards === 0) setMessage(`"${card.card_name}" ya tenía el precio al día.`)
      else if (data.withPrice > 0) setMessage(`Precio de "${card.card_name}" actualizado.`)
      else setMessage(`No se encontró precio para "${card.card_name}".`)
      await loadBinder()
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al consultar el precio') }
    finally { setFetchingPriceId(null) }
  }

  function handleReorder(sheetIndex: number, newSlots: (SlotCard | null)[]) {
    setPendingOrder(newSlots); setHasUnsavedChanges(true)
    setCards((prev) => {
      const baseSlot = sheetIndex * SLOTS_PER_SHEET + 1
      const withoutSheet = prev.filter((c) => c.slot_number < baseSlot || c.slot_number >= baseSlot + SLOTS_PER_SHEET)
      const reordered = newSlots.map((s, i) => s ? { ...s, slot_number: baseSlot + i } : null).filter(Boolean) as SlotCard[]
      return [...withoutSheet, ...reordered]
    })
  }

  async function saveOrder() {
    if (!binder || !pendingOrder) return; setMessage(null)
    try {
      const updates = pendingOrder.map((s) => {
        if (!s) return null
        return fetch(`/api/binder/slots/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot_number: s.slot_number }) })
      }).filter(Boolean)
      await Promise.all(updates)
      setHasUnsavedChanges(false); setPendingOrder(null)
      await loadBinder(); setMessage('Orden guardado.')
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al guardar el orden') }
  }

  function cancelEdit() {
    setIsEditing(false); setHasUnsavedChanges(false); setPendingOrder(null); loadBinder()
  }

  async function handleToggleFeatured(cardId: string, isFeatured: boolean) {
    try {
      const res = await fetch(`/api/binder/slots/${cardId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_featured: isFeatured }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, is_featured: isFeatured } : c)))
      setMessage(isFeatured ? '⭐ Carta destacada en tu perfil.' : 'Carta quitada de destacadas.')
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al destacar carta') }
  }

  async function removeSlot(slotId: string) {
    try {
      const res = await fetch(`/api/binder/slots/${slotId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      await loadBinder()
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al quitar carta') }
  }

  async function markCardSold(cardId: string) {
    const res = await completeSaleAction({ cardId })
    if (!res.ok) { setMessage(res.error); return }
    await loadBinder()
    setMessage(res.completedClaims > 0
      ? 'Carta marcada como vendida. La transacción quedó cerrada: podés calificar a la otra parte desde Mis transacciones.'
      : 'Carta marcada como vendida y quitada de la venta.')
  }

  async function addCardToSlot(card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) {
    if (!binder || !slotTarget) throw new Error('Sin binder o slot objetivo')
    const slotNumber = slotTarget.sheetIndex * SLOTS_PER_SHEET + slotTarget.slotIndex + 1
    await fetchJson('/api/binder/slots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binder_id: binder.id, slot_number: slotNumber, card_id: card.id, card_name: card.name, set_id: card.set_id, number: card.number, language, condition: condition || null, variant: variant || 'normal' })
    })
    await loadBinder()
  }

  async function addCardToNearestSlot(card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) {
    if (!binder) throw new Error('Sin binder')
    const lang = language ?? 'ES'; const cond = condition || null; const varnt = variant || 'normal'
    const existing = cards.find((c) => c.card_id === card.id && c.language === lang && (c.condition ?? null) === cond && (c.variant ?? 'normal') === varnt)
    const slotNumber = existing?.slot_number ?? findNextEmptySlot(cards)
    await fetchJson('/api/binder/slots', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binder_id: binder.id, slot_number: slotNumber, card_id: card.id, card_name: card.name, set_id: card.set_id, number: card.number, language: lang, condition: cond, variant: varnt })
    })
    await loadBinder()
    if (existing) setMessage(`"${card.name}" x${(existing.quantity ?? 1) + 1} en tu binder.`)
    else setMessage(`"${card.name}" agregada a tu binder en el bolsillo #${slotNumber}.`)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowPokedex(true) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <div className="flex">
        <ResponsiveNav
          profile={profile}
          user={user}
          onShowProfile={() => router.push('/ajustes')}
          onShowClaims={() => router.push('/claims')}
        />

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-5 pb-20 lg:pb-0">
          {/* Profile Header — glass panel */}
          <BinderProfileHeader
            profile={profile}
            isVerified={isVerified}
            trainerScore={trainerScore}
            bindersCount={binders.length}
            onCreate={() => setSettingsModal('create')}
          />

          {/* Content: Gallery or Binder View */}
          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-5">
              {isGallery ? (
                <BinderGallery binders={binders} />
              ) : (
                <BinderContent
                  binder={binder}
                  cards={cards}
                  loading={loading}
                  tab={tab}
                  setTab={setTab}
                  query={query}
                  setQuery={setQuery}
                  message={message}
                  setMessage={setMessage}
                  currentSheet={currentSheet}
                  setCurrentSheet={setCurrentSheet}
                  sheets={sheets}
                  filteredCards={filteredCards}
                  isEditing={isEditing}
                  setIsEditing={setIsEditing}
                  hasUnsavedChanges={hasUnsavedChanges}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  pendingOrder={pendingOrder}
                  setPendingOrder={setPendingOrder}
                  fetchingPriceId={fetchingPriceId}
                  slotTarget={slotTarget}
                  setSlotTarget={setSlotTarget}
                  editCard={editCard}
                  setEditCard={setEditCard}
                  requireProfileFor={requireProfileFor}
                  setRequireProfileFor={setRequireProfileFor}
                  showPokedex={showPokedex}
                  setShowPokedex={setShowPokedex}
                  showWantlistSearch={showWantlistSearch}
                  setShowWantlistSearch={setShowWantlistSearch}
                  profile={profile}
                  setProfile={setProfile}
                  wantlist={wantlist}
                  wantlistLoading={wantlistLoading}
                  totalCards={totalCards}
                  saleCount={saleCount}
                  tradeCount={tradeCount}
                  totalValue={totalValue}
                  fmtValue={fmtValue}
                  binderSets={binderSets}
                  selectBinder={selectBinder}
                  copyShareLink={copyShareLink}
                  copyWantlistLink={copyWantlistLink}
                  shareBinderWhatsApp={shareBinderWhatsApp}
                  shareWantlistWhatsApp={shareWantlistWhatsApp}
                  openShareImage={openShareImage}
                  togglePublic={togglePublic}
                  handleDeleteBinder={handleDeleteBinder}
                  cancelEdit={cancelEdit}
                  saveOrder={saveOrder}
                  fetchCardPrice={fetchCardPrice}
                  handleReorder={handleReorder}
                  handleToggleFeatured={handleToggleFeatured}
                  removeSlot={removeSlot}
                  markCardSold={markCardSold}
                  addCardToSlot={addCardToSlot}
                  addCardToNearestSlot={addCardToNearestSlot}
                  addToWantlist={addToWantlist}
                  removeFromWantlist={removeFromWantlist}
                  updateWantlistBudget={updateWantlistBudget}
                  updateWantlistCurrency={updateWantlistCurrency}
                  onOpenSettings={() => setSettingsModal('edit')}
                />
              )}
            </div>

            {/* Sidebar — always visible */}
            <BinderSidebar
              isGallery={isGallery}
              bindersCount={binders.length}
              binderSets={binderSets}
              saleCount={saleCount}
              tradeCount={tradeCount}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      {settingsModal && (
        <BinderSettingsModal
          binder={settingsModal === 'edit' ? binder : null}
          cards={cards}
          isPremium={isPremium}
          onSave={async (values) => {
            if (settingsModal === 'create') await handleSaveBinder(values)
            else await handleUpdateBinder(values)
            setSettingsModal(null)
          }}
          onClose={() => setSettingsModal(null)}
        />
      )}

      {showShareImage && profile?.username && binder && shareBinderUrl && (
        <BinderShareModal
          binderTitle={binder?.title ?? 'Mi Binder'}
          cards={cards}
          username={profile.username}
          binderUrl={shareBinderUrl}
          onClose={() => setShowShareImage(false)}
        />
      )}

      {slotTarget && (
        <PokedexSearchModal title="Agregar al bolsillo elegido" onClose={() => setSlotTarget(null)}
          onSelect={async (card, language, condition, variant) => { await addCardToSlot(card, language, condition, variant); setSlotTarget(null) }} />
      )}
      {showWantlistSearch && (
        <PokedexSearchModal title="Pokédex · Agregar a buscadas" showCondition={false} onClose={() => setShowWantlistSearch(false)}
          onSelect={async (card) => { try { await addToWantlist(card) } catch (err) { setMessage(err instanceof Error ? err.message : 'Error al agregar a buscadas'); throw err }; setShowWantlistSearch(false) }} />
      )}
      {showPokedex && (
        <PokedexSearchModal onClose={() => setShowPokedex(false)}
          onSelect={async (card, language, condition, variant) => { await addCardToNearestSlot(card, language, condition, variant); setShowPokedex(false) }} />
      )}
      {editCard && (
        <EditCardModal card={editCard} profile={profile} onRequireProfile={setRequireProfileFor}
          onSaved={() => { setMessage(`"${editCard.card_name}" actualizada.`); setEditCard(null) }} onClose={() => setEditCard(null)} />
      )}
      {requireProfileFor && editCard && (
        <ProfileRequiredModal cardName={editCard.card_name} onComplete={(p) => { setProfile(p); setRequireProfileFor(null) }} onClose={() => setRequireProfileFor(null)} />
      )}

      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-fuchsia-500/50 bg-slate-900/95 px-5 py-3 shadow-[0_0_30px_rgba(217,70,239,0.3)] backdrop-blur-xl">
          <span className="text-sm font-semibold text-fuchsia-200">Tenés cambios sin guardar</span>
          <button onClick={saveOrder} className="rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-bold text-white shadow-lg transition-colors hover:bg-fuchsia-400">Guardar Orden</button>
          <button onClick={cancelEdit} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-400 transition-colors hover:text-white">Cancelar</button>
        </div>
      )}
    </div>
  )
}
