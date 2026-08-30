'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ResponsiveNav from '@/components/ResponsiveNav'
import type { SearchResult } from '@/types'
import type { CardLanguage } from '@/lib/cardLanguage'
import WantlistSlot from '@/components/binder/WantlistSlot'
import dynamic from 'next/dynamic'
import ReservedClaimsBanner from '@/components/ReservedClaimsBanner'
import {
  CardsIcon,
  DiscordIcon,
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
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
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
const RecentActivityTimeline = dynamic(() => import('@/components/RecentActivityTimeline'), {
  ssr: false
})

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
          onShowProfile={async () => {
            const p = profile ?? (await loadProfile())
            if (p?.username) router.push(`/profile/${encodeURIComponent(p.username)}?tab=settings`)
            else setMessage('No se pudo abrir tu perfil. Intentalo de nuevo.')
          }}
          onShowClaims={() => router.push('/claims')}
        />

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-5 pb-20 lg:pb-0">
          {/* Profile Header — glass panel */}
          <div className="relative mb-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#00ffcc]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-slate-800 bg-gradient-to-tr from-[#00ffcc]/30 via-violet-500/20 to-rose-500/30 text-3xl font-black text-white shadow-[0_0_30px_rgba(0,255,204,0.35)]">
                    {(profile?.username?.[0] ?? 'B').toUpperCase()}
                  </div>
                  <div className="absolute -inset-1.5 rounded-full border border-[#00ffcc]/25" />
                  {isVerified && (
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#00ffcc] text-xs font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.6)]">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="truncate text-2xl font-extrabold tracking-tight text-white">
                      {profile?.username ?? 'Mis Binders'}
                    </h1>
                    {trainerScore && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                        <span className="text-sm">{trainerScore.rank.icon}</span> {trainerScore.rank.name}
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                        ⚡ Verificado
                      </span>
                    )}
                  </div>
                  {trainerScore && trainerScore.nextRank && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full border border-slate-700/50 bg-slate-900">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400 shadow-[0_0_8px_rgba(241,193,0,0.4)]"
                          style={{ width: `${Math.round(trainerScore.progress * 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {trainerScore.xp.toLocaleString('en-US')} XP · {trainerScore.nextRank.icon} {trainerScore.nextRank.name}
                      </span>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <CardsIcon className="h-4 w-4 text-[#00ffcc]" />
                      <span className="font-semibold text-white">{binders.length}</span>
                      binder{binders.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                <button
                  onClick={() => setSettingsModal('create')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#00ffcc] px-4 py-2 text-sm font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all hover:brightness-110"
                >
                  <PlusIcon width={15} height={15} />
                  Crear nuevo binder
                </button>
              </div>
            </div>
          </div>

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
            <aside className="w-full shrink-0 space-y-4 lg:w-64">
              {/* Progreso por Set — only when a binder is selected */}
              {!isGallery && binderSets.length > 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                    <span className="text-[#00ffcc]">◉</span> Progreso por Set
                  </h3>
                  <div className="space-y-3">
                    {binderSets.map((s) => (
                      <div key={s.set_id}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="truncate font-medium text-slate-300">{s.set_id.toUpperCase()}</span>
                          <span className="font-mono text-[#00ffcc]">{s.count}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
                          <div className="h-full rounded-full bg-[#00ffcc]/70 shadow-[0_0_8px_rgba(0,255,204,0.4)]" style={{ width: `${Math.max(6, (s.count / Math.max(1, binderSets[0].count)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                  <span className="text-[#00ffcc]">◉</span> {isGallery ? 'Resumen' : 'Estadísticas'}
                </h3>
                {isGallery ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total binders</span>
                      <span className="font-mono text-lg font-bold text-[#00ffcc]">{binders.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                      <p className="text-xl font-extrabold text-emerald-400">{saleCount}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">En venta</p>
                    </div>
                    <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                      <p className="text-xl font-extrabold text-sky-400">{tradeCount}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Cambios</p>
                    </div>
                  </div>
                )}
              </div>

              {!isGallery && <RecentActivityTimeline mode="own" limit={4} />}

              <a href="https://discord.gg/NxuWmFKPuZ" target="_blank" rel="noopener noreferrer"
                className="pulse-glow flex w-full items-center justify-center gap-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-4 text-sm font-bold text-[#5865F2] transition-all hover:bg-[#5865F2]/20 active:scale-[0.98]">
                <DiscordIcon className="h-6 w-6" /> Unirme al Discord
              </a>
            </aside>
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

/* ─── Binder Content (rendered when a binder is selected) ─── */

interface BinderContentProps {
  binder: Binder | null
  cards: SlotCard[]
  loading: boolean
  tab: 'collection' | 'wantlist'
  setTab: (t: 'collection' | 'wantlist') => void
  query: string
  setQuery: (q: string) => void
  message: string | null
  setMessage: (m: string | null) => void
  currentSheet: number
  setCurrentSheet: (n: number) => void
  sheets: SlotCard[][]
  filteredCards: SlotCard[]
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (v: boolean) => void
  pendingOrder: (SlotCard | null)[] | null
  setPendingOrder: (v: (SlotCard | null)[] | null) => void
  fetchingPriceId: string | null
  slotTarget: { sheetIndex: number; slotIndex: number } | null
  setSlotTarget: (v: { sheetIndex: number; slotIndex: number } | null) => void
  editCard: SlotCard | null
  setEditCard: (c: SlotCard | null) => void
  requireProfileFor: Availability | null
  setRequireProfileFor: (v: Availability | null) => void
  showPokedex: boolean
  setShowPokedex: (v: boolean) => void
  showWantlistSearch: boolean
  setShowWantlistSearch: (v: boolean) => void
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  wantlist: WantlistCard[]
  wantlistLoading: boolean
  totalCards: number
  saleCount: number
  tradeCount: number
  totalValue: number
  fmtValue: (n: number) => string
  binderSets: { set_id: string; count: number }[]
  selectBinder: (id: string) => Promise<void>
  copyShareLink: () => Promise<void>
  copyWantlistLink: () => Promise<void>
  shareBinderWhatsApp: () => Promise<void>
  shareWantlistWhatsApp: () => Promise<void>
  openShareImage: () => Promise<void>
  togglePublic: () => Promise<void>
  handleDeleteBinder: () => Promise<void>
  cancelEdit: () => void
  saveOrder: () => Promise<void>
  fetchCardPrice: (card: SlotCard) => Promise<void>
  handleReorder: (sheetIndex: number, newSlots: (SlotCard | null)[]) => void
  handleToggleFeatured: (cardId: string, isFeatured: boolean) => Promise<void>
  removeSlot: (slotId: string) => Promise<void>
  markCardSold: (cardId: string) => Promise<void>
  addCardToSlot: (card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) => Promise<void>
  addCardToNearestSlot: (card: SearchResult, language: CardLanguage, condition?: CardCondition | '', variant?: string) => Promise<void>
  addToWantlist: (card: SearchResult) => Promise<void>
  removeFromWantlist: (id: string) => Promise<void>
  updateWantlistBudget: (id: string, maxBudget: number | null) => Promise<void>
  updateWantlistCurrency: (id: string, currency: Currency) => Promise<void>
  onOpenSettings: () => void
}

function BinderContent({
  binder, cards, loading, tab, setTab, query, setQuery, message, setMessage,
  currentSheet, setCurrentSheet, sheets, filteredCards, isEditing, setIsEditing,
  hasUnsavedChanges, pendingOrder, setPendingOrder, fetchingPriceId, slotTarget, setSlotTarget,
  editCard, setEditCard, requireProfileFor, setRequireProfileFor, showPokedex, setShowPokedex,
  showWantlistSearch, setShowWantlistSearch, profile, setProfile, wantlist, wantlistLoading,
  totalCards, saleCount, tradeCount, totalValue, fmtValue, binderSets,
  selectBinder, copyShareLink, copyWantlistLink, shareBinderWhatsApp, shareWantlistWhatsApp,
  openShareImage, togglePublic, handleDeleteBinder, cancelEdit, saveOrder,
  fetchCardPrice, handleReorder, handleToggleFeatured, removeSlot, markCardSold,
  addCardToSlot, addCardToNearestSlot, addToWantlist, removeFromWantlist,
  updateWantlistBudget, updateWantlistCurrency, onOpenSettings
}: BinderContentProps) {
  const router = useRouter()

  function handleTabChange(nextTab: 'collection' | 'wantlist') {
    setTab(nextTab)
    if (binder?.id) {
      const params = new URLSearchParams(window.location.search)
      params.set('tab', nextTab)
      router.replace(`/binder?${params.toString()}`, { scroll: false })
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Active Binder Header Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
        <div aria-hidden="true" className="absolute inset-0 z-0 bg-slate-950 bg-no-repeat bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${binderBackgroundForSheet(1, binder?.background)})` }} />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/binder')}
              className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
              title="Volver a mis binders"
            >
              ←
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-bold text-white">
                  {binder?.title ?? 'Cargando binder...'}
                </h2>
                <button
                  onClick={togglePublic}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                    binder?.is_public
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                  title="Cambiar visibilidad público/privado"
                >
                  {binder?.is_public ? '🌐 Público' : '🔒 Privado'}
                </button>
              </div>
              {binder?.description && (
                <p className="mt-0.5 truncate text-xs text-slate-400">{binder.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{totalCards} cartas</span>
                {totalValue > 0 && <span>· ~${fmtValue(totalValue)} USD</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenSettings}
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px] text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              title="Personalizar el binder"
            >
              <span className="inline-flex h-full w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950/60 px-3 py-1.5 transition-colors group-hover:bg-transparent">
                <SparklesIcon className="h-3.5 w-3.5 text-fuchsia-300" />
                Personalizar
              </span>
            </button>
            <button
              onClick={openShareImage}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-3 py-1.5 text-xs font-semibold text-[#00ffcc] transition-colors hover:bg-[#00ffcc]/20"
            >
              <ShareIcon className="h-3.5 w-3.5" /> Compartir
            </button>
            <button
              onClick={handleDeleteBinder}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
              title="Eliminar binder"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Eliminar
            </button>
          </div>
        </div>
      </div>

      {/* Binder Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1 sm:w-auto">
          <button type="button" onClick={() => handleTabChange('collection')} aria-pressed={tab === 'collection'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${tab === 'collection' ? 'bg-[#00ffcc]/15 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <CardsIcon className="h-4 w-4" /> Mi Colección
          </button>
          <button type="button" onClick={() => handleTabChange('wantlist')} aria-pressed={tab === 'wantlist'}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${tab === 'wantlist' ? 'bg-fuchsia-500/15 text-fuchsia-300 shadow-[0_0_12px_rgba(217,70,239,0.2)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
            <SparklesIcon className="h-4 w-4" /> Cartas Buscadas
            {wantlist.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${tab === 'wantlist' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-400'}`}>
                {wantlist.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" strokeLinecap="round" /></svg>
            </span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en colección…"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-8 text-sm text-slate-200 placeholder-slate-600 transition-colors focus:border-[#00ffcc]/50 focus:ring-1 focus:ring-[#00ffcc]/40" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white" aria-label="Limpiar búsqueda">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
              </button>
            )}
          </div>
          {tab === 'collection' ? (
            <>
              <button onClick={() => setShowPokedex(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#00ffcc] px-3.5 py-2 text-sm font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all hover:brightness-110">
                <PlusIcon width={15} height={15} /> Agregar carta
              </button>
              <button onClick={() => { if (isEditing) cancelEdit(); else setIsEditing(true) }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${isEditing ? 'bg-fuchsia-500 text-white shadow-[0_0_12px_rgba(217,70,239,0.25)] hover:bg-fuchsia-400' : 'border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white'}`}>
                {isEditing ? '✋ Terminar edición' : '✏️ Editar orden'}
              </button>
            </>
          ) : (
            <button onClick={() => setShowWantlistSearch(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-fuchsia-500 px-3.5 py-2 text-sm font-bold text-white shadow-[0_0_12px_rgba(217,70,239,0.25)] transition-all hover:bg-fuchsia-400">
              <PlusIcon width={15} height={15} /> Agregar carta
            </button>
          )}
        </div>
      </div>

      <ReservedClaimsBanner cards={cards} onShowClaims={() => {}} />

      {isEditing && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 px-3.5 py-2 text-xs text-fuchsia-200">
          <span>💡 <strong>Modo edición activo:</strong> En celular mantené presionada una carta 1 segundo para moverla.</span>
          <button onClick={cancelEdit} className="shrink-0 font-bold underline hover:text-white">Terminar</button>
        </div>
      )}

      {binder && !binder.is_public && cards.some((c) => c.is_for_sale || c.is_for_trade) && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <p className="text-xs text-amber-300/80">
            {cards.filter((c) => c.is_for_sale || c.is_for_trade).length} carta{cards.filter((c) => c.is_for_sale || c.is_for_trade).length !== 1 ? 's' : ''} en marketplace · binder privado
          </p>
          <button onClick={togglePublic} className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30">
            Hacer público
          </button>
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
          {message}
        </div>
      )}

      {/* ── Main View: Loading state or Tab Content ── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[63/88] animate-pulse rounded-xl bg-slate-800/50" />
            ))}
          </div>
        </div>
      ) : tab === 'collection' ? (
        <CollectionView
          binder={binder}
          filteredCards={filteredCards}
          query={query}
          sheets={sheets}
          currentSheet={currentSheet}
          setCurrentSheet={setCurrentSheet}
          isEditing={isEditing}
          fetchingPriceId={fetchingPriceId}
          profile={profile}
          fetchCardPrice={fetchCardPrice}
          handleReorder={handleReorder}
          handleToggleFeatured={handleToggleFeatured}
          removeSlot={removeSlot}
          markCardSold={markCardSold}
          setSlotTarget={setSlotTarget}
          setEditCard={setEditCard}
        />
      ) : (
        <WantlistView
          binder={binder}
          wantlist={wantlist}
          wantlistLoading={wantlistLoading}
          currentSheet={currentSheet}
          copyWantlistLink={copyWantlistLink}
          shareWantlistWhatsApp={shareWantlistWhatsApp}
          setShowWantlistSearch={setShowWantlistSearch}
          removeFromWantlist={removeFromWantlist}
          updateWantlistBudget={updateWantlistBudget}
          updateWantlistCurrency={updateWantlistCurrency}
        />
      )}
    </div>
  )
}

/* ─── Sub-views ─── */

function CollectionView({ binder, filteredCards, query, sheets, currentSheet, setCurrentSheet, isEditing, fetchingPriceId, profile, fetchCardPrice, handleReorder, handleToggleFeatured, removeSlot, markCardSold, setSlotTarget, setEditCard }: {
  binder: Binder | null; filteredCards: SlotCard[]; query: string; sheets: SlotCard[][]; currentSheet: number; setCurrentSheet: (n: number) => void
  isEditing: boolean; fetchingPriceId: string | null; profile: Profile | null
  fetchCardPrice: (card: SlotCard) => Promise<void>; handleReorder: (sheetIndex: number, newSlots: (SlotCard | null)[]) => void
  handleToggleFeatured: (cardId: string, isFeatured: boolean) => Promise<void>; removeSlot: (slotId: string) => Promise<void>; markCardSold: (cardId: string) => Promise<void>
  setSlotTarget: (v: { sheetIndex: number; slotIndex: number } | null) => void; setEditCard: (c: SlotCard | null) => void
}) {
  if (query.trim() !== '' && filteredCards.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-white">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-500">Ninguna carta coincide con la búsqueda.</p>
      </div>
    )
  }

  const spreadCount = Math.max(1, Math.ceil(sheets.length / 2))

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/70 shadow-2xl">
      <div aria-hidden="true" className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${binderBackgroundForSheet(currentSheet * 2 + 1, binder?.background)})` }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090d16]/80 via-transparent to-[#090d16]/90" />
      <div className="relative z-10 flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-4 py-6 binder-scroll">
        {[0, 1].map((offset) => {
          const sheetIndex = currentSheet * 2 + offset
          const sheetCards = sheets[sheetIndex]
          const currentSlots = sheetCards ? padSheet(sheetCards) : Array(9).fill(null)
          return (
            <div key={sheetIndex} className="flex min-w-[calc(100%-2rem)] snap-center flex-col gap-3 md:min-w-[calc(50%-1rem)]">
              <div className="flex items-center justify-between px-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white drop-shadow-md">Hoja {sheetIndex + 1}</h3>
                <span className="rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-slate-400">{currentSlots.filter(Boolean).length}/9</span>
              </div>
              <EditableBinderGrid
                sheetNumber={sheetIndex + 1} slots={currentSlots} isEditing={isEditing}
                onRemoveSlot={removeSlot} onEmptySlotClick={(slotIndex) => setSlotTarget({ sheetIndex, slotIndex })}
                onEditCard={setEditCard} onMarkSold={markCardSold} onCardUpdated={() => {}} onReorder={(newSlots) => handleReorder(sheetIndex, newSlots)}
                onToggleFeatured={handleToggleFeatured} onFetchPrice={fetchCardPrice} fetchingPriceId={fetchingPriceId} background={binder?.background}
              />
            </div>
          )
        })}
      </div>
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-800 bg-slate-950/90 px-5 py-1.5">
        <button onClick={() => setCurrentSheet(Math.max(0, currentSheet - 1))} disabled={currentSheet === 0} className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30" aria-label="Hoja anterior">‹</button>
        <span className="font-mono text-xs font-semibold text-slate-300">{currentSheet + 1} / {spreadCount}</span>
        <button onClick={() => setCurrentSheet(Math.min(spreadCount - 1, currentSheet + 1))} disabled={currentSheet >= spreadCount - 1} className="text-slate-400 transition-colors hover:text-[#00ffcc] disabled:opacity-30" aria-label="Hoja siguiente">›</button>
      </div>
    </div>
  )
}

function WantlistView({ binder, wantlist, wantlistLoading, currentSheet, copyWantlistLink, shareWantlistWhatsApp, setShowWantlistSearch, removeFromWantlist, updateWantlistBudget, updateWantlistCurrency }: {
  binder: Binder | null; wantlist: WantlistCard[]; wantlistLoading: boolean; currentSheet: number
  copyWantlistLink: () => Promise<void>; shareWantlistWhatsApp: () => Promise<void>; setShowWantlistSearch: (v: boolean) => void
  removeFromWantlist: (id: string) => Promise<void>; updateWantlistBudget: (id: string, maxBudget: number | null) => Promise<void>; updateWantlistCurrency: (id: string, currency: Currency) => Promise<void>
}) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-fuchsia-500/30 shadow-2xl">
      <div aria-hidden="true" className="absolute inset-0 z-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${binderBackgroundForSheet(currentSheet * 2 + 1, binder?.background)})` }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#090d16]/85 via-[#170b1f]/70 to-[#090d16]/90" />
      <div className="relative z-10 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold text-fuchsia-200">✨ {wantlist.length} carta{wantlist.length !== 1 ? 's' : ''} en tu lista de buscadas</p>
            <p className="text-xs text-slate-400">Quien tenga estas cartas puede ofrecerte un Swap directo por WhatsApp.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={copyWantlistLink} className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20">
              <ShareIcon className="h-4 w-4" /> Compartir buscadas
            </button>
            <button onClick={() => setShowWantlistSearch(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600">
              <PlusIcon width={15} height={15} /> Agregar carta buscada
            </button>
          </div>
        </div>
        {wantlistLoading ? (
          <p className="py-16 text-center text-slate-500">Cargando buscadas…</p>
        ) : wantlist.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fuchsia-500/40 bg-slate-900/80 px-6 py-16 text-center">
            <SparklesIcon className="mx-auto h-8 w-8 text-fuchsia-400" />
            <p className="mt-3 text-lg font-semibold text-white">Tu lista de buscadas está vacía</p>
            <p className="mt-1 text-sm text-slate-500">Agregá las cartas que estás buscando para que otros coleccionistas puedan ofrecerte un Swap por WhatsApp.</p>
            <button onClick={() => setShowWantlistSearch(true)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-600">
              <PlusIcon width={15} height={15} /> Agregar carta buscada
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {wantlist.map((w) => (
              <WantlistSlot key={w.id} entry={w} owner onRemove={removeFromWantlist} onBudgetChange={updateWantlistBudget} onCurrencyChange={updateWantlistCurrency} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
