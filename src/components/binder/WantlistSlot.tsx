'use client'

import { useState } from 'react'
import Link from 'next/link'
import PokemonCard from '@/components/PokemonCard'
import { ChatIcon, TrashIcon } from '@/components/icons'
import { CURRENCIES, formatPrice, type Currency } from '@/lib/priceGuide'
import { toSlotCard, type SlotCard } from '@/lib/sheets'
import { slugify } from '@/lib/utils'
import type { WantlistCard } from '@/types/wantlist'

interface WantlistSlotProps {
  entry: WantlistCard
  /** Modo dueño: permite editar el presupuesto y quitar la carta. */
  owner?: boolean
  /** Deep link de WhatsApp "¡Yo la tengo!" (se muestra solo si viene). */
  offerUrl?: string
  onRemove?: (id: string) => void
  onBudgetChange?: (id: string, budget: number | null) => void
  onCurrencyChange?: (id: string, currency: Currency) => void
}

function formatBudgetLabel(budget: number, currency: string): string {
  const base = formatPrice(budget, currency)
  if (currency === 'USD') return `${base} USD`
  if (currency === 'EUR') return `${base} EUR`
  return base
}

// Convierte una entrada de wantlist al contrato SlotCard para renderizar la
// misma carta con efecto holo/3D que el binder (PokemonCard).
function toWantlistSlotCard(w: WantlistCard): SlotCard {
  return toSlotCard({
    id: w.card_id,
    binder_id: '',
    card_id: w.card_id,
    card_name: w.card_name,
    set_id: w.set_id,
    set_name: w.set_name,
    number: w.number,
    slot_number: 0,
    market_price: null,
    status: null,
    price_override: null,
    is_for_sale: false,
    is_for_trade: false,
    price: null,
    trade_notes: null,
    condition: null,
    language: null,
    manual_price: null,
    currency: w.currency,
    is_user_reported: false,
    reserved_until: null,
    rarity: w.rarity ?? null,
    supertype: w.supertype ?? null,
    subtypes: w.subtypes ?? null,
    types: w.types ?? null,
    image: w.image
  })
}

export default function WantlistSlot({
  entry,
  owner = false,
  offerUrl,
  onRemove,
  onBudgetChange,
  onCurrencyChange
}: WantlistSlotProps) {
  const [budget, setBudget] = useState(entry.max_budget ?? '')
  const slotCard = toWantlistSlotCard(entry)

  return (
    <div className="group relative rounded-xl border border-fuchsia-500/50 bg-slate-950 shadow-[0_0_15px_rgba(217,70,239,0.2)] transition-shadow hover:shadow-[0_0_20px_rgba(217,70,239,0.35)]">
      {/* Carta con efecto holo (mismo PokemonCard que el binder) — click va a la ficha */}
      <Link
        href={`/carta/${encodeURIComponent(entry.card_id)}/${slugify(entry.card_name)}`}
        className="relative block aspect-[63/88] rounded-xl"
      >
        {/* Badge flotante superior */}
        <span className="absolute left-2 top-2 z-10 rounded-md bg-fuchsia-500/90 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow">
          Buscada
        </span>
        <PokemonCard card={slotCard} />
      </Link>

      <div className="border-t border-fuchsia-500/30 p-2.5">
        <Link
          href={`/carta/${encodeURIComponent(entry.card_id)}/${slugify(entry.card_name)}`}
          className="block"
        >
          <p className="truncate text-xs font-semibold text-white transition-colors group-hover:text-fuchsia-300">
            {entry.card_name}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">
            {entry.set_name || entry.set_id} · {entry.number}
          </p>
        </Link>

        {entry.max_budget != null && (
          <span className="mt-2 inline-block rounded-md border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-1 text-[10px] font-bold text-fuchsia-300">
            Busco pago hasta {formatBudgetLabel(entry.max_budget, entry.currency)}
          </span>
        )}

        {owner ? (
          <div className="mt-2.5 flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="number"
                min={0}
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                onBlur={() => {
                  const value = budget === '' || budget === null ? null : Number(budget)
                  onBudgetChange?.(entry.id, value)
                }}
                placeholder="Presupuesto $"
                aria-label="Presupuesto máximo"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none transition-colors focus:border-fuchsia-500"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-semibold uppercase text-slate-500">
                {entry.currency}
              </span>
            </div>
            <select
              value={entry.currency}
              onChange={(e) => onCurrencyChange?.(entry.id, e.target.value as Currency)}
              aria-label="Moneda del presupuesto"
              className="rounded-lg border border-slate-700 bg-slate-950 px-1.5 py-1.5 text-[9px] font-semibold uppercase text-slate-400 outline-none transition-colors focus:border-fuchsia-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove?.(entry.id)}
              aria-label="Quitar de buscadas"
              className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-400"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ) : offerUrl ? (
          <a
            href={offerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-2 text-center text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-500"
          >
            <ChatIcon className="h-3.5 w-3.5" />
            ¡Yo la tengo!
          </a>
        ) : null}
      </div>
    </div>
  )
}