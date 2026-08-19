'use client'

import { useEffect, useState } from 'react'
import BinderSheet from '@/components/BinderSheet'
import SheetPagination from '@/components/SheetPagination'
import SellerInfoBadge, { type SellerInfo } from '@/components/SellerInfoBadge'
import SellerReputationCard from '@/components/SellerReputationCard'
import BinderTabs, { type BinderTab } from '@/components/binder/BinderTabs'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { ShareIcon, SparklesIcon } from '@/components/icons'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { createClient } from '@/lib/supabase/client'
import type { WantlistCard } from '@/types/wantlist'
import {
  computeTotalValue,
  groupIntoSheets,
  padSheet,
  toSlotCard,
  type SlotCard
} from '@/lib/sheets'

interface Binder {
  id: string
  title: string
}

export default function PublicBinderPage({ binderId }: { binderId: string }) {
  const [binder, setBinder] = useState<Binder | null>(null)
  const [cards, setCards] = useState<SlotCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [seller, setSeller] = useState<SellerInfo | null>(null)
  const [tab, setTab] = useState<BinderTab>(() => {
    if (typeof window === 'undefined') return 'collection'
    return new URLSearchParams(window.location.search).get('tab') === 'wantlist'
      ? 'wantlist'
      : 'collection'
  })
  const [wantlist, setWantlist] = useState<WantlistCard[]>([])
  const [viewer, setViewer] = useState<{ username?: string; slotByCardId: Record<string, string> } | null>(null)
  const [matchCount, setMatchCount] = useState(0)
  const [matchSellerUsername, setMatchSellerUsername] = useState<string | null>(null)

  useEffect(() => {
    if (!binderId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/public/binder/${binderId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        setBinder(data.binder)
        setCards((data.cards || []).map(toSlotCard))
        setSeller(data.owner ?? null)
        setWantlist(data.wantlist || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Binder no encontrado')
      } finally {
        setLoading(false)
      }
    })()
  }, [binderId])

  // Sesión del visitante: permite armar el deep link "¡Yo la tengo!" apuntando
  // a su propio binder, y matchear su wantlist contra las cartas del vendedor.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user || cancelled) return

        const [profileRes, binderRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/binder?all=1')
        ])
        const profileData = await profileRes.json()
        const binderData = await binderRes.json()
        if (cancelled) return

        const username = profileRes.ok ? profileData.profile?.username : undefined
        const slotByCardId: Record<string, string> = {}
        for (const c of binderData.cards || []) {
          if (!slotByCardId[c.card_id]) slotByCardId[c.card_id] = c.id
        }
        setViewer({ username, slotByCardId })
      } catch {
        // visitante sin sesión: la wantlist se ve sin botón de oferta
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Banner de matchmaking: cartas del vendedor que coinciden con mi wantlist
  useEffect(() => {
    if (!seller?.id) return
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (!data.user || !seller?.id) return
        const res = await fetch(`/api/matchmaking?sellerId=${encodeURIComponent(seller.id)}`)
        const data2 = await res.json()
        if (res.ok && data2.count > 0) {
          setMatchCount(data2.count)
          setMatchSellerUsername(data2.sellerUsername ?? null)
        }
      } catch {
        // sin banner si falla el matchmaking
      }
    })()
  }, [seller])

  function buildOfferUrl(w: WantlistCard): string | null {
    if (!viewer || !seller?.whatsapp_number) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = viewer.username
      ? `${origin}/binder/${encodeURIComponent(viewer.username)}`
      : `${origin}/binder`
    const slotUrl = viewer.slotByCardId[w.card_id]
      ? `${base}?card=${viewer.slotByCardId[w.card_id]}`
      : base
    return buildSwapOfferUrl({
      sellerUsername: seller.username ?? '',
      sellerPhone: seller.whatsapp_number ?? '',
      cardName: w.card_name,
      setName: w.set_name || w.set_id,
      cardNumber: w.number,
      slotUrl
    })
  }

  // Compartir el binder de buscadas: el link aterriza en la pestaña wantlist
  // (su preview OG ya muestra cuántas cartas busca el dueño).
  async function handleShareWantlist() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = seller?.username
      ? `${origin}/binder/${encodeURIComponent(seller.username)}`
      : `${origin}/b/${binderId}`
    const url = `${base}?tab=wantlist`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copiá el link de buscadas:', url)
    }
  }

  const totalValue = computeTotalValue(cards)
  const sheets = groupIntoSheets(cards)
  if (sheets.length === 0) sheets.push([])

  if (error) {
    return (
      <div className="min-h-screen text-slate-200">
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
        <div className="w-full sm:w-64 rounded-xl border border-yellow-400/20 bg-slate-900 px-4 py-2 text-right">
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

      {matchCount > 0 && (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-300">
            🎯 ¡Tienen cartas compatibles! @{matchSellerUsername ?? 'vendedor'} tiene{' '}
            {matchCount} carta{matchCount !== 1 ? 's' : ''} de tu lista de buscadas.
          </p>
        </div>
      )}

      <div className="mb-6">
        <BinderTabs active={tab} onChange={setTab} wantlistCount={wantlist.length} />
      </div>

      {loading ? (
        <p className="py-20 text-center text-slate-500">Cargando binder…</p>
      ) : tab === 'wantlist' ? (
        wantlist.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-fuchsia-500/40 bg-slate-900 px-6 py-16 text-center">
            <SparklesIcon className="mx-auto h-8 w-8 text-fuchsia-400" />
            <p className="mt-3 text-lg font-semibold text-white">
              @{seller?.username ?? 'Este coleccionista'} no tiene cartas en su lista de buscadas
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cuando agregue cartas a su Wantlist, vas a poder ofrecerle un Swap directo por WhatsApp.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 px-4 py-3">
              <p className="text-sm font-semibold text-fuchsia-200">
                @{seller?.username ?? 'Este coleccionista'} busca {wantlist.length} carta
                {wantlist.length !== 1 ? 's' : ''}
              </p>
              <button
                type="button"
                onClick={handleShareWantlist}
                className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-500/20"
              >
                <ShareIcon className="h-4 w-4" />
                Compartir buscadas
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {wantlist.map((w) => (
                <WantlistSlot key={w.id} entry={w} offerUrl={buildOfferUrl(w) ?? undefined} />
              ))}
            </div>
          </div>
        )
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