import { useEffect, useMemo, useRef, useState } from 'react'
import './CardSearch.css'

export default function CardSearch({ onSelect }) {
  const [sets, setSets] = useState([])
  const [selectedSet, setSelectedSet] = useState('')
  const [cards, setCards] = useState([])
  const [setName, setSetName] = useState('')
  const [query, setQuery] = useState('')
  const [loadingSets, setLoadingSets] = useState(true)
  const [loadingCards, setLoadingCards] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => {
    async function loadSets() {
      try {
        const res = await fetch('/api/sets')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
        setSets(data.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingSets(false)
      }
    }
    loadSets()
  }, [])

  async function handleSetChange(e) {
    const setCode = e.target.value
    setSelectedSet(setCode)
    setQuery('')
    setError(null)

    if (!setCode) {
      setCards([])
      setSetName('')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoadingCards(true)
    try {
      const res = await fetch(`/api/set-cards?set=${encodeURIComponent(setCode)}`, {
        signal: controller.signal
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.matches) {
          throw new Error('Código de set ambiguo: ' + data.matches.map((m) => m.set_id).join(', '))
        }
        throw new Error(data.error || `Error ${res.status}`)
      }
      setCards(data.cards || [])
      setSetName(data.set || '')
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      setLoadingCards(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return cards
      .filter((c) => (c.card_info?.name || '').toLowerCase().includes(q))
      .slice(0, 30)
  }, [cards, query])

  const price = (card) => {
    const tcg = card.tcgplayer?.prices?.[0]
    const cm = card.cardmarket?.prices?.[0]
    if (tcg?.market_price) return { value: `$${tcg.market_price}`, source: 'TCGPlayer' }
    if (tcg?.mid_price) return { value: `$${tcg.mid_price}`, source: 'TCGPlayer' }
    if (cm?.trend) return { value: `€${cm.trend}`, source: 'CardMarket' }
    if (cm?.avg) return { value: `€${cm.avg}`, source: 'CardMarket' }
    return null
  }

  return (
    <section className="search">
      <div className="search__controls">
        <select
          className="search__select"
          value={selectedSet}
          onChange={handleSetChange}
          disabled={loadingSets}
        >
          <option value="">
            {loadingSets ? 'Cargando sets…' : 'Elegí un set…'}
          </option>
          {sets.map((s) => (
            <option key={s.set_id} value={s.set_code || s.set_id}>
              {s.name} ({s.card_count} cartas)
            </option>
          ))}
        </select>

        <input
          className="search__input"
          type="text"
          placeholder="Filtrar por nombre… ej: charizard"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!selectedSet || loadingCards}
        />
      </div>

      {error && <p className="search__error">{error}</p>}

      {loadingCards && <p className="search__loading">Descargando cartas del set…</p>}

      {!loadingCards && selectedSet && !error && cards.length === 0 && (
        <p className="search__empty">Este set no tiene cartas.</p>
      )}

      {!loadingCards && selectedSet && query.trim() && filtered.length === 0 && (
        <p className="search__empty">
          No hay «{query.trim()}» en {setName}
        </p>
      )}

      {!loadingCards && selectedSet && query.trim() && filtered.length > 0 && (
        <>
          <p className="search__count">
            {filtered.length} coincidencia{filtered.length !== 1 ? 's' : ''} para «{query.trim()}» en {setName}
          </p>
          <ul className="search__results">
            {filtered.map((card) => {
              const p = price(card)
              return (
                <li key={card.id}>
                  <button className="search__card" onClick={() => onSelect(card)}>
                    <img
                      className="search__card-image"
                      src={`/api/image?id=${encodeURIComponent(card.id)}`}
                      alt={card.card_info?.name}
                      loading="lazy"
                    />
                    <span className="search__card-name">{card.card_info?.name}</span>
                    <span className="search__card-set">
                      {card.card_info?.card_number}
                      {card.card_info?.rarity ? ` · ${card.card_info.rarity}` : ''}
                    </span>
                    {p && (
                      <span className="search__card-price">
                        <span className="search__card-price-value">{p.value}</span>
                        <span className="search__card-price-source">{p.source}</span>
                      </span>
                    )}
                    {!p && <span className="search__card-price search__card-price--none">Sin precio</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}