import { useState } from 'react'
import './CardSearch.css'

export default function CardSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=20`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`)
      }

      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
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

      {results.length > 0 && (
        <ul className="search__results">
          {results.map((card) => (
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
                <span className="search__card-price">
                  {card.tcgplayer?.prices?.[0]?.market_price
                    ? `$${card.tcgplayer.prices[0].market_price}`
                    : card.cardmarket?.prices?.[0]?.trend
                      ? `€${card.cardmarket.prices[0].trend}`
                      : 'Sin precio'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}