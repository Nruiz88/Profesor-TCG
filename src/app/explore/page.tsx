'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import MarketGrid, { BindersGrid } from '@/components/MarketGrid'
import type { ExploreBinder, ExploreCard, ExploreFacets } from '@/app/api/public/explore/route'
import { ENERGY_TYPES, TypeIcon } from '@/components/TypeIcon'
import { CARD_LANGUAGES, CARD_LANGUAGE_META } from '@/lib/cardLanguage'
import { ChevronDownIcon, SearchIcon, XIcon } from '@/components/icons'
import GhostPokemon from '@/components/GhostPokemon'

type View = 'cards' | 'binders'
type Mode = 'all' | 'for_sale' | 'for_trade'

// Acentos por modo de transacción
const MODES: { id: Mode; label: string; activeClass: string; dotClass: string }[] = [
  {
    id: 'all',
    label: 'Todas',
    activeClass: 'bg-rose-500/15 text-rose-400',
    dotClass: 'bg-rose-400'
  },
  {
    id: 'for_sale',
    label: '🟢 En venta',
    activeClass: 'bg-emerald-500/15 text-emerald-400',
    dotClass: 'bg-emerald-400'
  },
  {
    id: 'for_trade',
    label: '🔵 Para intercambio',
    activeClass: 'bg-blue-500/15 text-blue-400',
    dotClass: 'bg-blue-400'
  }
]

const SORTS = [
  { id: 'recent', label: 'Más recientes' },
  { id: 'price_asc', label: 'Precio: menor a mayor' },
  { id: 'price_desc', label: 'Precio: mayor a menor' }
]

const EMPTY_FACETS: ExploreFacets = { sets: [], rarities: [], cities: [] }

// Paginación incremental: la API devuelve hasMore y el cliente pide de a
// PAGE_SIZE hasta MAX_RESULTS (mismo tope del server).
const PAGE_SIZE = 60
const MAX_RESULTS = 120

function SelectField({
  value,
  onChange,
  children,
  label
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  label: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800/80 bg-slate-950/70 py-2.5 pl-3 pr-9 text-xs font-medium text-slate-300 outline-none transition-colors hover:border-slate-600 focus:border-rose-500/60"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  )
}

export default function ExplorePage() {
  const [view, setView] = useState<View>('cards')
  const [mode, setMode] = useState<Mode>('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
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

  // Paginación: limitRef evita re-crear load() (y re-fetchear) al cargar más;
  // limit es solo para el estado del botón.
  const limitRef = useRef(PAGE_SIZE)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const load = useCallback(
    async (append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ view })
        if (view === 'cards') {
          params.set('mode', mode)
          if (debouncedQ) params.set('q', debouncedQ)
          if (setFilter) params.set('set', setFilter)
          if (rarityFilter) params.set('rarity', rarityFilter)
          if (cityFilter) params.set('city', cityFilter)
          if (typeFilter) params.set('type', typeFilter)
          if (languageFilter) params.set('language', languageFilter)
          params.set('limit', String(limitRef.current))
          params.set('sort', sort)
        }
        const res = await fetch(`/api/public/explore?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar')
        if (view === 'cards') {
          setCards((prev) => (append ? [...prev, ...(data.cards || [])] : data.cards || []))
          setFacets(data.facets || EMPTY_FACETS)
          setHasMore(data.hasMore === true)
        } else {
          setBinders(data.binders || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [view, mode, debouncedQ, setFilter, rarityFilter, cityFilter, typeFilter, languageFilter, sort]
  )

  // Cualquier cambio de filtro/vista reinicia la paginación a la primera página
  useEffect(() => {
    limitRef.current = PAGE_SIZE
    setLimit(PAGE_SIZE)
    setHasMore(false)
    void load(false)
  }, [load])

  function loadMore() {
    if (loadingMore) return
    limitRef.current = Math.min(limitRef.current + PAGE_SIZE, MAX_RESULTS)
    setLimit(limitRef.current)
    void load(true)
  }

  const hasActiveFilters = !!(q || setFilter || rarityFilter || cityFilter || typeFilter || languageFilter)
  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0]

  return (
    <div className="relative min-h-screen bg-[#090d16] text-slate-200">
      <GhostPokemon />

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* Hero simplificado */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(244,63,94,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.08),transparent_55%)]"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              🛍️ El mercado{' '}
              <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
                de la comunidad
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Cartas en venta e intercambio con precio en vivo.{' '}
              <span className="font-semibold text-emerald-300">Contactá directo por WhatsApp</span>{' '}
              con un clic.
            </p>
          </div>
        </section>

        {/* Cómo funciona: 3 pasos */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: '🔍', title: 'Explorá', desc: 'Filtrá por tipo, rareza o idioma' },
            { icon: '💚', title: 'Contactá', desc: 'Un clic te abre WhatsApp con el vendedor' },
            { icon: '🤝', title: 'Coordiná', desc: 'Acordá precio y entrega, ¡listo!' }
          ].map((step) => (
            <div key={step.title} className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/30 px-4 py-3">
              <span className="text-2xl">{step.icon}</span>
              <div>
                <p className="text-sm font-bold text-white">{step.title}</p>
                <p className="text-[11px] text-slate-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Switch de vista (fuera de la caja de filtros) */}
        <div className="mt-8 flex w-fit gap-2">
          {(
            [
              { id: 'cards', label: '🎴 Cartas sueltas' },
              { id: 'binders', label: '📁 Binders destacados' }
            ] as { id: View; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${
                view === t.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
                  : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Caja de filtros estilo Pokédex */}
        <section className="mt-4 rounded-3xl border border-slate-800/90 bg-slate-900/40 p-4 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-5">
          {/* Buscador con lupa acento */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscá por nombre de carta, Pokémon o número de set…"
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 py-3 pl-11 pr-10 text-sm text-white placeholder-slate-600 outline-none backdrop-blur transition-colors focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20"
              aria-label="Buscar cartas"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 transition-colors hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <XIcon width={15} height={15} />
              </button>
            )}
          </div>

          {view === 'cards' && (
            <>
              {/* Fila de tipos de energía */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Tipo de energía
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  <button
                    onClick={() => setTypeFilter('')}
                    className={`shrink-0 rounded-xl border bg-slate-950 px-3 py-2 text-xs font-bold transition-all ${
                      typeFilter === ''
                        ? 'scale-105 border-rose-500/60 text-rose-400 ring-2 ring-rose-500/40'
                        : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    Todas
                  </button>
                  {ENERGY_TYPES.map((t) => {
                    const active = typeFilter === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTypeFilter(active ? '' : t.id)}
                        aria-pressed={active}
                        title={t.label}
                        aria-label={t.label}
className={`flex shrink-0 items-center justify-center rounded-xl border bg-slate-950 p-2 transition-all ${
  active
    ? `scale-105 ring-2 ring-rose-500/60 ${t.borderClass}`
    : 'border-slate-800 hover:brightness-125'
}`}
                      >
                        <TypeIcon type={t.id} lg />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fila de idiomas */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Idioma
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
                  <button
                    onClick={() => setLanguageFilter('')}
                    className={`shrink-0 rounded-xl border bg-slate-950 px-3 py-2 text-xs font-bold transition-all ${
                      languageFilter === ''
                        ? 'scale-105 border-rose-500/60 text-rose-400 ring-2 ring-rose-500/40'
                        : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    Todas
                  </button>
                  {CARD_LANGUAGES.map((lang) => {
                    const active = languageFilter === lang
                    return (
                      <button
                        key={lang}
                        onClick={() => setLanguageFilter(active ? '' : lang)}
                        aria-pressed={active}
                        title={CARD_LANGUAGE_META[lang].label}
                        className={`shrink-0 rounded-xl border bg-slate-950 px-3 py-2 text-xs font-bold transition-all ${
                          active
                            ? 'scale-105 border-rose-500/60 text-rose-400 ring-2 ring-rose-500/40'
                            : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        <span aria-hidden="true">{CARD_LANGUAGE_META[lang].flag}</span>{' '}
                        <span className="hidden sm:inline">{CARD_LANGUAGE_META[lang].label}</span>
                        <span className="sm:hidden">{lang}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Fila inferior: modos + dropdowns */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {/* Modos de transacción */}
                <div className="flex rounded-xl bg-slate-950/80 p-1">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      aria-pressed={mode === m.id}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        mode === m.id ? m.activeClass : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${mode === m.id ? m.dotClass : 'bg-slate-700'}`}
                      />
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Dropdowns compactos */}
                <SelectField value={setFilter} onChange={setSetFilter} label="Filtrar por expansión">
                  <option value="">Sets</option>
                  {facets.sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>

                <SelectField value={rarityFilter} onChange={setRarityFilter} label="Filtrar por rareza">
                  <option value="">Rarezas</option>
                  {facets.rarities.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </SelectField>

                <SelectField value={cityFilter} onChange={setCityFilter} label="Filtrar por ciudad">
                  <option value="">Ciudades</option>
                  {facets.cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </SelectField>

                <div className="ml-auto">
                  <SelectField value={sort} onChange={setSort} label="Ordenar">
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>
            </>
          )}

          {/* Estado de filtros */}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                {view === 'cards'
                  ? `${cards.length}${hasMore ? '+' : ''}`
                  : String(binders.length)}
              </span>
              <p className="text-xs text-slate-500">
                {view === 'cards'
                  ? `${activeMode.label.toLowerCase()}${typeFilter ? ` · ${ENERGY_TYPES.find((t) => t.id === typeFilter)?.label ?? typeFilter}` : ''}${languageFilter ? ` · ${CARD_LANGUAGE_META[languageFilter as keyof typeof CARD_LANGUAGE_META]?.label ?? languageFilter}` : ''}`
                  : 'binders destacados'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setQ('')
                  setSetFilter('')
                  setRarityFilter('')
                  setCityFilter('')
                  setTypeFilter('')
                  setLanguageFilter('')
                  setSort('recent')
                }}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-white"
              >
                <XIcon width={12} height={12} />
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        {/* Resultados */}
        <section className="mt-6">
          {error ? (
            <div className="rounded-2xl border border-red-900/50 bg-red-950/30 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-red-400">{error}</p>
            </div>
          ) : view === 'cards' ? (
            <>
              <MarketGrid cards={cards} loading={loading} />
              {hasMore && !loading && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-rose-500/50 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-rose-400" />
                        Cargando más…
                      </>
                    ) : (
                      <>Cargar más cartas ({limit} de hasta {MAX_RESULTS})</>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <BindersGrid binders={binders} loading={loading} />
          )}
        </section>
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Profesor TCG · Hecho con ❤️ para coleccionistas
      </footer>
    </div>
  )
}
