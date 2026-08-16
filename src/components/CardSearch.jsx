import { useState } from 'react'
import './CardSearch.css'

export default function CardSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=10`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`)
      }

      setResults(data.results || [])
      setSearched(query.trim())
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

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
      <form className="search__form" onSubmit={handleSubmit}>
        <input
          className="search__input"
          type="text"
          placeholder="Buscar carta… ej: charizard ex"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="search__button" type="submit" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {error && <p className="search__error">{error}</p>}

      {loading && <p className="search__loading">Consultando PokéWallet…</p>}

      {!loading && searched && results.length === 0 && !error && (
        <p className="search__empty">No se encontraron cartas para «{searched}»</p>
      )}

      {results.length > 0 && (
        <>
          <p className="search__count">
            {results.length} resultados para «{searched}»
          </p>
          <ul className="search__results">
            {results.map((card) => {
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
                      {card.card_info?.set_name} · {card.card_info?.card_number}
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