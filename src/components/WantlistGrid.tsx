'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import WantlistSlot from '@/components/binder/WantlistSlot'
import { buildSwapOfferUrl } from '@/lib/matchmaking'
import { createClient } from '@/lib/supabase/client'
import WantCardModal from '@/app/v2/WantCardModal'
import type { PublicWantlistEntry } from '@/app/api/public/wantlist/route'
import type { WantlistCard } from '@/types/wantlist'

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
 * Grilla de cartas buscadas por la comunidad, compartida entre la home y la
 * página /buscados. Resuelve la sesión del visitante para armar el deep link
 * de WhatsApp "¡Yo la tengo!" apuntando al slot de su binder; si el visitante
 * no puede ofertar, muestra un link "Ver carta" a la página pública.
 */
export default function WantlistGrid({
  entries,
  compact = false
}: {
  entries: PublicWantlistEntry[]
  /** Modo compacto (home): cartas ~30% más chicas con más columnas. */
  compact?: boolean
}) {
  const [viewer, setViewer] = useState<{
    username?: string
    slotByCardId: Record<string, string>
  } | null>(null)
  const [selected, setSelected] = useState<PublicWantlistEntry | null>(null)

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

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-fuchsia-500/30 bg-slate-900 px-6 py-14 text-center">
        <p className="text-lg font-semibold text-white">Sin resultados</p>
        <p className="mt-1 text-sm text-slate-500">
          Ninguna carta buscada coincide con la búsqueda o los filtros.
        </p>
      </div>
    )
  }

  return (
    <>
    <div
      className={
        compact
          ? 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
          : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
      }
    >
      {entries.map((w) => {
        const offerUrl = buildOfferUrl(w)
        return (
          <div key={w.id}>
            {/* Header del buscador: avatar + username + ciudad */}
            <div className="mb-1.5 flex items-center gap-1.5">
              <Link
                href={`/profile/${encodeURIComponent(w.username)}`}
                title={`@${w.username} busca ${w.card_name}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-600 to-fuchsia-400 text-[9px] font-black text-white shadow shadow-fuchsia-900/50"
              >
                {(w.username[0] ?? '?').toUpperCase()}
              </Link>
              <Link
                href={`/profile/${encodeURIComponent(w.username)}`}
                className="min-w-0 truncate text-[11px] font-bold text-fuchsia-300 transition-colors hover:text-fuchsia-200"
                title={`@${w.username}`}
              >
                @{w.username}
              </Link>
              {w.city && (
                <span className="ml-auto flex shrink-0 items-center gap-0.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-fuchsia-200">
                  {w.city}
                </span>
              )}
            </div>

            <WantlistSlot entry={toWantlistCard(w)} offerUrl={offerUrl ?? undefined} />

            {!offerUrl && (
              <button
                type="button"
                onClick={() => setSelected(w)}
                className="mt-2 block w-full rounded-lg border border-slate-700 px-2.5 py-1.5 text-center text-xs font-bold text-slate-300 transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-300"
              >
                Ver carta
              </button>
            )}
          </div>
        )
      })}
    </div>

      {/* Modal de la carta buscada (sola, sin fondo, con efecto holo) */}
      {selected && (
        <WantCardModal entry={toWantlistCard(selected)} onClose={() => setSelected(null)} />
      )}
    </>
  )
}