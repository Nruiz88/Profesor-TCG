'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/components/SlotSearchModal'
import { ArrowRightIcon, ScaleIcon, SearchIcon, XIcon } from '@/components/icons'

interface SelectedCard extends SearchResult {
  price: number | null
  priceLoading: boolean
}

type SideId = 'a' | 'b'

// Umbral: debajo del 6% de la suma se considera "justo"
const FAIR_THRESHOLD = 0.06

function computeVerdict(a: number | null, b: number | null) {
  if (a == null || b == null) return null
  if (a <= 0 && b <= 0) {
    return { kind: 'none', text: 'Sin precios disponibles para estas cartas' }
  }
  const total = a + b
  const diff = a - b
  const pct = total > 0 ? Math.abs(diff) / total : 0
  if (pct < FAIR_THRESHOLD) {
    return {
      kind: 'fair',
      text: '⚖️ Intercambio justo — los valores están muy parejos.'
    }
  }
  if (diff > 0) {
    return {
      kind: 'a',
      text: `Ventaja Lado A — el Lado B debería sumar $${diff.toFixed(2)} USD en efectivo para equilibrar.`
    }
  }
  return {
    kind: 'b',
    text: `Ventaja Lado B — el Lado A debería sumar $${(-diff).toFixed(2)} USD en efectivo para equilibrar.`
  }
}

interface SideSlotProps {
  side: SideId
  label: string
  accent: string
  selected: SelectedCard | null
  onSelect: (card: SearchResult) => void
  onClear: () => void
}

function SideSlot({ side, label, accent, selected, onSelect, onClear }: SideSlotProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al buscar')
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected.image}
          alt={selected.name}
          loading="lazy"
          className="h-24 w-[68px] rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white" title={selected.name}>
            {selected.name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {selected.set_name} · {selected.number}
          </p>
          <p className={`mt-1 text-sm font-bold ${accent}`}>
            {selected.priceLoading
              ? 'Buscando precio…'
              : selected.price != null
                ? `$${selected.price.toFixed(2)} USD`
                : 'Sin precio de mercado'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar carta"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-400 transition-colors hover:bg-white/20 hover:text-white"
        >
          <XIcon width={14} height={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {side === 'a' ? 'Lado A · Tu carta' : 'Lado B · La carta del otro'}
      </p>
      <div className="relative">
        <SearchIcon
          width={15}
          height={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscá una carta (ej: Charizard)…"
          aria-label={`Buscar carta para ${label}`}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-binder-accent"
        />
        {open && (
          <>
            <button
              type="button"
              aria-label="Cerrar búsqueda"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-2xl">
              {loading && <p className="px-3 py-3 text-xs text-slate-500">Buscando…</p>}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-500">
                  Sin resultados para «{query.trim()}»
                </p>
              )}
              {results.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setQuery('')
                    setResults([])
                    onSelect(card)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.name}
                    loading="lazy"
                    className="h-12 w-9 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{card.name}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {card.set_name} · {card.number}
                      {card.rarity ? ` · ${card.rarity}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TradeFairnessWidget() {
  const [a, setA] = useState<SelectedCard | null>(null)
  const [b, setB] = useState<SelectedCard | null>(null)

  const pick = (side: SideId, card: SearchResult) => {
    const entry: SelectedCard = { ...card, price: null, priceLoading: true }
    if (side === 'a') setA(entry)
    else setB(entry)

    fetch(`/api/public/price?cardId=${encodeURIComponent(card.id)}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error')
        const patch: Partial<SelectedCard> = {
          price: data.price ?? null,
          priceLoading: false
        }
        if (side === 'a') setA((prev) => (prev?.id === card.id ? { ...prev, ...patch } : prev))
        else setB((prev) => (prev?.id === card.id ? { ...prev, ...patch } : prev))
      })
      .catch(() => {
        const patch: Partial<SelectedCard> = { price: null, priceLoading: false }
        if (side === 'a') setA((prev) => (prev?.id === card.id ? { ...prev, ...patch } : prev))
        else setB((prev) => (prev?.id === card.id ? { ...prev, ...patch } : prev))
      })
  }

  const priceA = a?.price ?? null
  const priceB = b?.price ?? null
  const verdict = computeVerdict(priceA, priceB)
  const aW =
    priceA != null && priceB != null && priceA + priceB > 0
      ? (priceA / (priceA + priceB)) * 100
      : 50

  // Carta con mayor valor para buscar el trade en la comunidad
  const ctaCard =
    a || b
      ? [a, b].filter(Boolean).reduce((max, c) => ((c!.price ?? 0) >= (max!.price ?? 0) ? c : max))!
      : null

  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-binder-accent">
            <ScaleIcon width={14} height={14} />
            Calculadora de cambio justo
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ¿Es justo ese intercambio?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Compará el valor de mercado de dos cartas antes de proponer un trueque o cerrar por
            WhatsApp. Precios de TCGplayer/Cardmarket vía TCGdex.
          </p>
        </div>
      </div>

      {/* Slots */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SideSlot
          side="a"
          label="Lado A"
          accent="text-emerald-400"
          selected={a}
          onSelect={(c) => pick('a', c)}
          onClear={() => setA(null)}
        />
        <SideSlot
          side="b"
          label="Lado B"
          accent="text-sky-400"
          selected={b}
          onSelect={(c) => pick('b', c)}
          onClear={() => setB(null)}
        />
      </div>

      {/* Barra de equilibrio */}
      {a && b && (
        <div className="mt-6">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${aW}%` }}
            />
            <div
              className="absolute inset-y-0 right-0 bg-gradient-to-l from-sky-500 to-sky-400 transition-all duration-500"
              style={{ width: `${100 - aW}%` }}
            />
            <div
              className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white shadow-lg transition-all duration-500"
              style={{ left: `calc(${aW}% - 2px)` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-400">
              Lado A · {priceA != null ? `$${priceA.toFixed(2)}` : '—'}
            </span>
            <span className="text-sky-400">
              {priceB != null ? `$${priceB.toFixed(2)}` : '—'} · Lado B
            </span>
          </div>
        </div>
      )}

      {/* Veredicto + CTA */}
      {a && b && (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              verdict?.kind === 'fair'
                ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                : verdict?.kind === 'a' || verdict?.kind === 'b'
                  ? 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
            }`}
          >
            {verdict?.text ?? 'Seleccioná cartas con precio para comparar.'}
          </p>
          <Link
            href={ctaCard ? `/explore?q=${encodeURIComponent(ctaCard.name)}` : '#'}
            aria-disabled={!ctaCard}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
              ctaCard
                ? 'bg-binder-accent text-white shadow-lg shadow-rose-900/30 hover:bg-rose-500'
                : 'pointer-events-none bg-slate-800 text-slate-500'
            }`}
          >
            Buscar este Trade en la Comunidad
            <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>
      )}

      {!a && !b && (
        <p className="mt-6 text-center text-sm text-slate-600">
          Elegí una carta en cada lado para calcular la diferencia.
        </p>
      )}
    </div>
  )
}
