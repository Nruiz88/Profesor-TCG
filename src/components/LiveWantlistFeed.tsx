'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { createClient } from '@/lib/supabase/client'
import { cardPublicUrl } from '@/lib/claim'
import type { PublicWantlistEntry } from '@/app/api/public/wantlist/route'
import type { WantlistCard } from '@/types/wantlist'

function SkeletonTile() {
  return (
    <div>
      <div className="shimmer mb-2 h-4 w-1/2 rounded" />
      <div className="overflow-hidden rounded-xl border border-fuchsia-500/20 bg-slate-950">
        <div className="shimmer aspect-[63/88] rounded-t-xl" />
        <div className="space-y-2 p-2.5">
          <div className="shimmer h-3 w-3/4 rounded" />
          <div className="shimmer h-2.5 w-1/2 rounded" />
        </div>
      </div>
    </div>
  )
}

// Reduce una entrada pública de wantlist al contrato WantlistCard que renderiza
// WantlistSlot (imagen + rareza + tipos con el mismo efecto holo del binder).
function toWantlistCard(w: PublicWantlistEntry): WantlistCard {
  return {
    id: w.id,
    card_id: w.card_id,
    card_name: w.card_name,
    set_id: w.set_id,
    set_name: w.set_name,
    number: w.number,
    max_budget: w.max_budget,
    currency: w.currency,
    image: w.image,
    rarity: w.rarity ?? null,
    supertype: w.supertype ?? null,
    subtypes: w.subtypes ?? null,
    types: w.types ?? null
  }
}

/**
 * Galería en vivo de la wantlist de la comunidad en la home: las últimas cartas
 * que alguien está buscando. Si el visitante tiene sesión, arma el deep link de
 * WhatsApp "¡Yo la tengo!" apuntando al slot de su binder.
 */
export default function LiveWantlistFeed() {
  const [entries, setEntries] = useState<PublicWantlistEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [viewer, setViewer] = useState<{
    username?: string
    slotByCardId: Record<string, string>
  } | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/public/wantlist?limit=12')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        if (active) setEntries(data.wantlist || [])
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Sesión del visitante: permite armar el deep link "¡Yo la tengo!" apuntando
  // al slot exacto de su binder dentro del mensaje de WhatsApp.
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
        // visitante sin sesión: las tarjetas se ven sin botón de oferta
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function buildOfferUrl(w: PublicWantlistEntry): string | null {
    if (!viewer || !w.whatsapp_number) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const base = viewer.username
      ? `${origin}/binder/${encodeURIComponent(viewer.username)}`
      : `${origin}/binder`
    const slotUrl = viewer.slotByCardId[w.card_id]
      ? `${base}?card=${viewer.slotByCardId[w.card_id]}`
      : base
    return buildSwapOfferUrl({
      sellerUsername: w.username,
      sellerPhone: w.whatsapp_number,
      cardName: w.card_name,
      setName: w.set_name || w.set_id,
      cardNumber: w.number,
      slotUrl
    })
  }

  if (error) return null

  return (
    <div>
      {entries === null ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-fuchsia-500/30 bg-slate-900 px-6 py-14 text-center">
          <p className="text-lg font-semibold text-white">La comunidad todavía no busca cartas</p>
          <p className="mt-1 text-sm text-slate-500">
            Agregá las cartas que estás buscando desde tu Binder y aparecen acá para que otros
            coleccionistas te ofrezcan un Swap por WhatsApp.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((w) => {
            const offerUrl = buildOfferUrl(w)
            return (
              <div key={w.id}>
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <Link
                    href={`/profile/${encodeURIComponent(w.username)}`}
                    className="min-w-0 truncate text-xs font-semibold text-fuchsia-300 transition-colors hover:text-fuchsia-200"
                    title={`@${w.username} busca ${w.card_name}`}
                  >
                    <span className="text-slate-500">@</span>
                    {w.username}
                    <span className="text-slate-500"> busca</span>
                  </Link>
                  {w.city && (
                    <span className="shrink-0 truncate text-[10px] text-slate-500">{w.city}</span>
                  )}
                </div>

                <WantlistSlot entry={toWantlistCard(w)} offerUrl={offerUrl ?? undefined} />

                {!offerUrl && (
                  <Link
                    href={cardPublicUrl(w.card_id, w.card_name)}
                    className="mt-2 block rounded-lg border border-slate-700 px-2.5 py-1.5 text-center text-xs font-bold text-slate-300 transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-300"
                  >
                    Ver carta
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}