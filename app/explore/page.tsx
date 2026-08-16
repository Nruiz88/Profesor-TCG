'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import MarketGrid, { BindersGrid } from '@/components/MarketGrid'
import type { ExploreBinder, ExploreCard, ExploreFacets } from '@/app/api/public/explore/route'

type View = 'cards' | 'binders'
type Mode = 'all' | 'for_sale' | 'for_trade'

const MODES: { id: Mode; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'for_sale', label: 'En venta' },
  { id: 'for_trade', label: 'Para intercambio' }
]

const SORTS = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'price_asc', label: 'Precio: menor a mayor' },
  { id: 'price_desc', label: 'Precio: mayor a menor' }
]

const EMPTY_FACETS: ExploreFacets = { sets: [], rarities: [], cities: [] }

export default function ExplorePage() {
  const [view, setView] = useState<View>('cards')
  const [mode, setMode] = useState<Mode>('all')
  // El buscador arranca con ?q= (deep-link desde la home: "Buscar este Trade").
  // También inicializamos debouncedQ con ese valor para que el PRIMER fetch ya
  // vaya filtrado (evita una carrera donde un fetch sin q pise el resultado).
  const [initialQ] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('q') ?? ''
  })
  const [q, setQ] = useState(initialQ)
  const [setFilter, setSetFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sort, setSort] = useState('recent')

  const [cards, setCards] = useState<ExploreCard[]>([])
  const [binders, setBinders] = useState<ExploreBinder[]>([])
  const [facets, setFacets] = useState<ExploreFacets>(EMPTY_FACETS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState(initialQ)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ view })
      if (view === 'cards') {
        params.set('mode', mode)
        if (debouncedQ) params.set('q', debouncedQ)
        if (setFilter) params.set('set', setFilter)
        if (rarityFilter) params.set('rarity', rarityFilter)
        if (cityFilter) params.set('city', cityFilter)
        params.set('sort', sort)
      }
      const res = await fetch(`/api/public/explore?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      if (view === 'cards') {
        setCards(data.cards || [])
        setFacets(data.facets || EMPTY_FACETS)
      } else {
        setBinders(data.binders || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [view, mode, debouncedQ, setFilter, rarityFilter, cityFilter, sort])

  useEffect(() => {
    load()
  }, [load])

  // Limpiar filtros que dependen de facets cuando cambian las cartas
  const availableSets = new Set(facets.sets.map((s) => s.id))
  const availableRarities = new Set(facets.rarities)
  const availableCities = new Set(facets.cities)

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-binder-accent/20 text-lg font-black text-binder-accent">
              P
            </span>
            <span className="text-lg font-bold text-white">
              Profesor TCG <span className="text-slate-500">· Explorar</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-slate-400 transition-colors hover:text-white">
              Inicio
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-700 px-3 py-1.5 font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Marketplace de la comunidad</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Explorá las cartas que la comunidad tiene en venta o acepta como intercambio, y contactá
          directo por WhatsApp a cada coleccionista.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          {(
            [
              { id: 'cards', label: 'Cartas sueltas' },
              { id: 'binders', label: 'Binders destacados' }
            ] as { id: View; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                view === t.id
                  ? 'bg-binder-accent/20 text-binder-accent ring-1 ring-binder-accent/40'
                  : 'border border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Barra de filtros */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {/* Buscador */}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscá por nombre de carta o Pokémon (ej: Charizard, Gengar)…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-binder-accent focus:outline-none"
            aria-label="Buscar cartas"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Modo (solo cartas) */}
            {view === 'cards' && (
              <div className="flex rounded-xl bg-slate-950 p-1">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      mode === m.id
                        ? 'bg-binder-accent/20 text-binder-accent'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Set */}
            {view === 'cards' && (
              <select
                value={setFilter}
                onChange={(e) => setSetFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-binder-accent focus:outline-none"
                aria-label="Filtrar por expansión"
              >
                <option value="">Todos los sets</option>
                {facets.sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Rareza */}
            {view === 'cards' && (
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-binder-accent focus:outline-none"
                aria-label="Filtrar por rareza"
              >
                <option value="">Todas las rarezas</option>
                {facets.rarities.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            {/* Ciudad */}
            {view === 'cards' && (
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-binder-accent focus:outline-none"
                aria-label="Filtrar por ciudad"
              >
                <option value="">Todas las ciudades</option>
                {facets.cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Ordenamiento */}
            {view === 'cards' && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="ml-auto rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-binder-accent focus:outline-none"
                aria-label="Ordenar"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Limpiar filtros */}
          {(q || setFilter || rarityFilter || cityFilter) && (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setQ('')
                  setSetFilter('')
                  setRarityFilter('')
                  setCityFilter('')
                  setSort('recent')
                }}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-white"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="mt-6">
          {error ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/30 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-red-400">{error}</p>
            </div>
          ) : view === 'cards' ? (
            <MarketGrid cards={cards} loading={loading} />
          ) : (
            <BindersGrid binders={binders} loading={loading} />
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Profesor TCG · Hecho con ❤️ para coleccionistas
      </footer>
    </div>
  )
}
