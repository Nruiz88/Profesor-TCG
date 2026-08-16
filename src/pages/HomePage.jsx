import { useState } from 'react'
import CardSearch from '../components/CardSearch'
import './HomePage.css'

export default function HomePage() {
  const [selected, setSelected] = useState(null)

  return (
    <div className="home">
      <header className="home__header">
        <h1>Profesor TCG</h1>
        <p className="home__tagline">Busca cartas de Pokémon TCG con precios de TCGPlayer y CardMarket</p>
      </header>

      <main className="home__main">
        <CardSearch onSelect={setSelected} />

        {selected && (
          <section className="home__detail">
            <div className="home__detail-top">
              <img
                className="home__card-image"
                src={`/api/image?id=${encodeURIComponent(selected.id)}`}
                alt={selected.card_info?.name}
              />
              <div>
                <h2>{selected.card_info?.name}</h2>
                <p>
                  {selected.card_info?.set_name} · {selected.card_info?.card_number}
                  {selected.card_info?.rarity ? ` · ${selected.card_info.rarity}` : ''}
                </p>
              </div>
            </div>
            <div className="home__prices">
              {selected.tcgplayer?.prices?.length > 0 && (
                <div className="price-card">
                  <h3>TCGPlayer (USD)</h3>
                  {selected.tcgplayer.prices.map((p) => (
                    <p key={p.sub_type_name}>
                      <strong>{p.sub_type_name}</strong>: ${p.market_price ?? p.mid_price ?? '—'}
                    </p>
                  ))}
                </div>
              )}
              {selected.cardmarket?.prices?.length > 0 && (
                <div className="price-card">
                  <h3>CardMarket (EUR)</h3>
                  {selected.cardmarket.prices.map((p) => (
                    <p key={p.variant_type}>
                      <strong>{p.variant_type}</strong>: €{p.trend ?? p.avg ?? p.low ?? '—'}
                    </p>
                  ))}
                </div>
              )}
              {!selected.tcgplayer?.prices?.length && !selected.cardmarket?.prices?.length && (
                <p className="price-card price-card--empty">Sin precios disponibles</p>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="home__footer">
        Datos: <a href="https://www.pokewallet.io" target="_blank" rel="noreferrer">PokéWallet API</a>
      </footer>
    </div>
  )
}