'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import MarketGrid from '@/components/MarketGrid'
import WantlistGrid from '@/components/WantlistGrid'
import type {
  ExploreCard,
  ExploreFacets
} from '@/app/api/public/explore/route'
import type {
  PublicWantlistEntry,
  WantlistFacets
} from '@/app/api/public/wantlist/route'
import { ArrowRightIcon } from '@/components/icons'
import HomeV2Filters, { type FilterMode } from './HomeV2Filters'
import HomeV2Tabs, { type TabId } from './HomeV2Tabs'
import MarketCardModal from './MarketCardModal'
import './HomeV2.css'

type Tab = TabId

const MARKET_PAGE = 30
const WANTLIST_PAGE = 24
const MAX_RESULTS = 120

const EMPTY_FACETS: ExploreFacets = { sets: [], rarities: [], variants: [], cities: [] }
const EMPTY_WANT_FACETS: WantlistFacets = { sets: [], rarities: [], cities: [] }

function WantlistSkeleton() {
  return (
    <div className="v2h-skel-grid">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i}>
          <div className="shimmer v2h-skel-head" />
          <div className="v2h-skel-card">
            <div className="shimmer v2h-skel-img" />
            <div className="v2h-skel-body">
              <div className="shimmer v2h-skel-line" />
              <div className="shimmer v2h-skel-line v2h-skel-line--short" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HomeV2() {
  const [tab, setTab] = useState<Tab>('market')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // Filtros del mercado (mismos que /explore)
  const [mode, setMode] = useState<FilterMode>('all')
  const [marketSet, setMarketSet] = useState('')
  const [marketRarity, setMarketRarity] = useState('')
  const [marketVariant, setMarketVariant] = useState('')
  const [marketLang, setMarketLang] = useState('')
  const [sort, setSort] = useState('recent')
  const [facets, setFacets] = useState<ExploreFacets>(EMPTY_FACETS)

  // Filtros de buscados
  const [wantRarity, setWantRarity] = useState('')
  const [wantSet, setWantSet] = useState('')
  const [wantSort, setWantSort] = useState('recent')
  const [wantFacets, setWantFacets] = useState<WantlistFacets>(EMPTY_WANT_FACETS)

  const [cards, setCards] = useState<ExploreCard[]>([])
  const [entries, setEntries] = useState<PublicWantlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<ExploreCard | null>(null)

  const limitRef = useRef(MARKET_PAGE)
  const offsetRef = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(
    async (append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (debouncedQ) params.set('q', debouncedQ)

        if (tab === 'market') {
          params.set('view', 'cards')
          params.set('mode', mode)
          if (marketSet) params.set('set', marketSet)
          if (marketRarity) params.set('rarity', marketRarity)
          if (marketVariant) params.set('variant', marketVariant)
          if (marketLang) params.set('language', marketLang)
          params.set('sort', sort)
          if (append) limitRef.current = Math.min(limitRef.current + MARKET_PAGE, MAX_RESULTS)
          else limitRef.current = MARKET_PAGE
          params.set('limit', String(limitRef.current))
          const res = await fetch(`/api/public/explore?${params.toString()}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Error al cargar el mercado')
          setCards((prev) => (append ? [...prev, ...(data.cards || [])] : data.cards || []))
          setFacets(data.facets || EMPTY_FACETS)
          setHasMore(data.hasMore === true)
        } else {
          if (wantRarity) params.set('rarity', wantRarity)
          if (wantSet) params.set('set', wantSet)
          params.set('sort', wantSort)
          if (append) offsetRef.current = Math.min(offsetRef.current + WANTLIST_PAGE, MAX_RESULTS)
          else offsetRef.current = 0
          params.set('limit', String(WANTLIST_PAGE))
          params.set('offset', String(offsetRef.current))
          const res = await fetch(`/api/public/wantlist?${params.toString()}`)
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Error al cargar buscados')
          setEntries((prev) => (append ? [...prev, ...(data.wantlist || [])] : data.wantlist || []))
          setWantFacets(data.facets || EMPTY_WANT_FACETS)
          setHasMore(data.hasMore === true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [
      tab,
      debouncedQ,
      mode,
      marketSet,
      marketRarity,
      marketVariant,
      marketLang,
      sort,
      wantRarity,
      wantSet,
      wantSort
    ]
  )

  useEffect(() => {
    limitRef.current = MARKET_PAGE
    offsetRef.current = 0
    setHasMore(false)
    void load(false)
  }, [load])

  function loadMore() {
    if (loadingMore) return
    void load(true)
  }

  function clearFilters() {
    setMode('all')
    setMarketSet('')
    setMarketRarity('')
    setMarketVariant('')
    setMarketLang('')
    setSort('recent')
    setWantRarity('')
    setWantSet('')
    setWantSort('recent')
    setQ('')
  }

  const isMarket = tab === 'market'
  const count = isMarket ? cards.length : entries.length

  const hasMarketFilters =
    mode !== 'all' ||
    !!marketSet ||
    !!marketRarity ||
    !!marketVariant ||
    !!marketLang
  const hasWantFilters = !!wantRarity || !!wantSet || wantSort !== 'recent'
  const hasActiveFilters = (isMarket ? hasMarketFilters : hasWantFilters) || !!q

  return (
    <main className="v2h-main">
      {/* Hero centrado y destacado */}
      <section className="v2h-hero">
        <div className="v2h-hero-glow" aria-hidden="true" />
        <div className="v2h-hero-content">
          <span className="v2h-hero-badge">
            <span className="v2h-hero-badge--market">🛍️ Mercado</span>
            <span className="v2h-hero-badge--sep">+</span>
            <span className="v2h-hero-badge--want">🔍 Wishlist</span>
          </span>
          <h1 className="v2h-hero-title">
            Comprá, vendé y <span className="v2h-hero-grad">encontrá</span> tu carta
          </h1>
          <p className="v2h-hero-sub">El mercado y las buscadas de la comunidad, en un solo lugar.</p>
        </div>
      </section>

      {/* Switch deslizante Mercado ⇄ Buscados */}
      <section className="v2h-tabs">
        <div className="v2h-tabs-center">
          <HomeV2Tabs tab={tab} onTabChange={setTab} count={count} hasMore={hasMore} />
        </div>
      </section>

      {/* Layout: filtros (izquierda) + resultados (derecha) */}
      <div className="v2h-layout">
        {/* Filtros */}
        <HomeV2Filters
          tab={tab}
          search={q}
          onSearchChange={setQ}
          facets={facets}
          wantFacets={wantFacets}
          mode={mode}
          onModeChange={setMode}
          marketSet={marketSet}
          onMarketSetChange={setMarketSet}
          marketRarity={marketRarity}
          onMarketRarityChange={setMarketRarity}
          marketVariant={marketVariant}
          onMarketVariantChange={setMarketVariant}
          marketLang={marketLang}
          onMarketLangChange={setMarketLang}
          sort={sort}
          onSortChange={setSort}
          wantRarity={wantRarity}
          onWantRarityChange={setWantRarity}
          wantSet={wantSet}
          onWantSetChange={setWantSet}
          wantSort={wantSort}
          onWantSortChange={setWantSort}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
        />

        {/* Resultados */}
        <section className="v2h-results">
          {error ? (
            <div className="v2h-error">
              <p className="v2h-error-text">{error}</p>
            </div>
          ) : isMarket ? (
            <>
              <MarketGrid cards={cards} loading={loading} compact holo onCardClick={setSelectedCard} />
              {hasMore && !loading && (
                <div className="v2h-more">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="v2h-more-btn v2h-more-btn--market"
                  >
                    {loadingMore ? (
                      <>
                        <span className="v2h-spinner" />
                        Cargando más…
                      </>
                    ) : (
                      <>Cargar más cartas</>
                    )}
                  </button>
                  <Link href="/explore" className="v2h-more-link">
                    Ver el mercado completo
                    <ArrowRightIcon width={12} height={12} />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              {loading && entries.length === 0 ? (
                <WantlistSkeleton />
              ) : (
                <WantlistGrid entries={entries} compact />
              )}
              {hasMore && !loading && (
                <div className="v2h-more">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="v2h-more-btn v2h-more-btn--want"
                  >
                    {loadingMore ? (
                      <>
                        <span className="v2h-spinner v2h-spinner--want" />
                        Cargando más…
                      </>
                    ) : (
                      <>Cargar más buscadas</>
                    )}
                  </button>
                  <Link href="/buscados" className="v2h-more-link v2h-more-link--want">
                    Ver todas las buscadas
                    <ArrowRightIcon width={12} height={12} />
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Modal de detalle del market */}
      {selectedCard && (
        <MarketCardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </main>
  )
}