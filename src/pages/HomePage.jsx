import { useState } from 'react'
import CardSearch from '../components/CardSearch'
import CardDetailModal from '../components/CardDetailModal'
import './HomePage.css'

export default function HomePage() {
  const [selected, setSelected] = useState(null)

  return (
    <div className="home">
      <header className="home__header">
        <div className="home__logo" aria-hidden="true" />
        <h1>Profesor TCG</h1>
        <p className="home__tagline">Elegí un set y filtrá por nombre — sin límites de búsqueda</p>
      </header>

      <main className="home__main">
        <CardSearch onSelect={setSelected} />
      </main>

      <footer className="home__footer">
        Datos: <a href="https://www.pokewallet.io" target="_blank" rel="noreferrer">PokéWallet API</a>
      </footer>

      {selected && <CardDetailModal card={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}