'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import SiteNav from '@/components/SiteNav'
import WantlistGrid from '@/components/WantlistGrid'
import type {
  PublicWantlistEntry,
  WantlistFacets
} from '@/app/api/public/wantlist/route'
import { ENERGY_TYPES, TypeIcon } from '@/components/TypeIcon'
import { ChevronDownIcon, SearchIcon, SparklesIcon, XIcon } from '@/components/icons'

const PAGE_SIZE = 24
const MAX_RESULTS = 120

const EMPTY_FACETS: WantlistFacets = { sets: [], cities: [] }

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
        className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800/80 bg-slate-950/70 py-2.5 pl-3 pr-9 text-xs font-medium text-slate-300 outline-none transition-colors hover:border-slate-600 focus:border-fuchsia-500/60"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
    </div>
  )
}

export default function BuscadosPage() {
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  const [entries, setEntries] = useState<PublicWantlistEntry[]>([])
  const [facets, setFacets] = useState<WantlistFacets>(EMPTY_FACETS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState('')

  const offsetRef = useRef(0)
  const [offset, setOffset] = useState(0)
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
        const params = new URLSearchParams()
        if (debouncedQ) params.set('q', debouncedQ)
        if (typeFilter) params.set('type', typeFilter)
        if (cityFilter) params.set('city', cityFilter)
        params.set('limit', String(PAGE_SIZE))
        params.set('offset', String(append ? offsetRef.current : 0))
        const res = await fetch(`/api/public/wantlist?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al cargar')
        setEntries((prev) => (append ? [...prev, ...(data.wantlist || [])] : data.wantlist || []))
        setFacets(data.facets || EMPTY_FACETS)
        setHasMore(data.hasMore === true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [debouncedQ, typeFilter, cityFilter]
  )

  // Cualquier cambio de filtro/búsqueda reinicia la paginación
  useEffect(() => {
    offsetRef.current = 0
    setOffset(0)
    setHasMore(false)
    void load(false)
  }, [load])

  function loadMore() {
    if (loadingMore) return
    const next = Math.min(offsetRef.current + PAGE_SIZE, MAX_RESULTS)
    offsetRef.current = next
    setOffset(next)
    void load(true)
  }

  const hasActiveFilters = !!(q || typeFilter || cityFilter)

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <SiteNav label="Buscados" active="buscados" />

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_55%)]"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fuchsia-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
              </span>
              Wantlist de la comunidad en vivo
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Cartas que la comunidad{' '}
              <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                está buscando
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Coleccionistas de todo el país publican acá las cartas que les faltan para su
              colección. Si tenés alguna, ofrecé un{' '}
              <span className="font-semibold text-fuchsia-300">Swap directo por WhatsApp</span> en
              un clic.
            </p>
          </div>
        </section>

        {/* Caja de filtros */}
        <section className="mt-8 rounded-3xl border border-fuchsia-500/15 bg-slate-900/40 p-4 shadow-[0_16px_50px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-5">
          {/* Buscador */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fuchsia-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscá por nombre de la carta que buscan…"
              className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/70 py-3 pl-11 pr-10 text-sm text-white placeholder-slate-600 outline-none backdrop-blur transition-colors focus:border-fuchsia-500/50 focus:ring-2 focus:ring-fuchsia-500/20"
              aria-label="Buscar cartas buscadas"
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
                    ? 'scale-105 border-fuchsia-500/60 text-fuchsia-400 ring-2 ring-fuchsia-500/40'
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
                        ? `scale-105 ring-2 ring-fuchsia-500/60 ${t.borderClass}`
                        : `border-slate-800 hover:${t.borderClass.replace('40', '70')} hover:brightness-125`
                    }`}
                  >
                    <TypeIcon type={t.id} lg />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dropdowns + estado */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <SelectField value={cityFilter} onChange={setCityFilter} label="Filtrar por ciudad">
              <option value="">Ciudades</option>
              {facets.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>

            <p className="ml-auto text-xs text-slate-500">
              {hasMore ? 'Mostrando ' : ''}
              {entries.length} carta{entries.length !== 1 ? 's' : ''}
              {hasMore ? '+' : ''}
              {typeFilter
                ? ` · ${ENERGY_TYPES.find((t) => t.id === typeFilter)?.label ?? typeFilter}`
                : ''}
            </p>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setQ('')
                  setTypeFilter('')
                  setCityFilter('')
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
          ) : loading && entries.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : (
            <>
              <WantlistGrid entries={entries} />
              {hasMore && !loading && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-3 text-sm font-semibold text-slate-200 shadow-lg backdrop-blur transition-colors hover:border-fuchsia-500/50 hover:text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {loadingMore ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-fuchsia-400" />
                        Cargando más…
                      </>
                    ) : (
                      <>Cargar más buscadas ({offset} de hasta {MAX_RESULTS})</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* CTA para sumar la propia wantlist */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/10 via-slate-900/60 to-violet-600/10 px-6 py-10 text-center">
          <SparklesIcon className="mx-auto h-8 w-8 text-fuchsia-400" />
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
            ¿Estás buscando cartas para tu colección?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Agregá tu Wantlist desde tu Binder: las cartas aparecen acá para toda la comunidad y
            cualquiera que las tenga puede ofrecerte un Swap directo por WhatsApp.
          </p>
          <a
            href="/binder"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/40 transition-colors hover:bg-fuchsia-500"
          >
            Agregar mis buscadas
          </a>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Profesor TCG · Hecho con ❤️ para coleccionistas
      </footer>
    </div>
  )
}