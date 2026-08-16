import Link from 'next/link'
import PokemonCard from '@/components/PokemonCard'
import type { SlotCard } from '@/lib/sheets'

// Cartas de ejemplo para la demo (datos del catálogo, para que los efectos holo apliquen)
const DEMO_CARDS: SlotCard[] = [
  {
    id: 'sm12-212',
    binder_id: 'demo',
    card_id: 'sm12-212',
    card_name: 'Charizard & Braixen-GX',
    set_id: 'sm12',
    number: '212',
    slot_number: 1,
    market_price: 86.18,
    rarity: 'Rare Ultra',
    supertype: 'Pokémon',
    subtypes: ['Basic', 'TAG TEAM', 'GX'],
    types: ['Fire'],
    image: 'https://images.pokemontcg.io/sm12/212_hires.png'
  },
  {
    id: 'swsh12pt5-156',
    binder_id: 'demo',
    card_id: 'swsh12pt5-156',
    card_name: 'Psychic Energy',
    set_id: 'swsh12pt5',
    number: '156',
    slot_number: 2,
    market_price: null,
    supertype: 'Energy',
    subtypes: ['Basic'],
    types: ['Psychic'],
    image: 'https://images.pokemontcg.io/swsh12pt5/156_hires.png'
  },
  {
    id: 'sm4-119',
    binder_id: 'demo',
    card_id: 'sm4-119',
    card_name: 'Silvally-GX',
    set_id: 'sm4',
    number: '119',
    slot_number: 3,
    market_price: 13.8,
    rarity: 'Rare Ultra',
    supertype: 'Pokémon',
    subtypes: ['Stage 1', 'GX'],
    types: ['Colorless'],
    image: 'https://images.pokemontcg.io/sm4/119_hires.png'
  }
]

const FEATURES = [
  {
    title: 'Binder virtual de 9 bolsillos',
    description:
      'Organizá tus cartas por hojas como en un binder de verdad, con múltiples binders para tus colecciones.'
  },
  {
    title: 'Precios de mercado en vivo',
    description:
      'Cada carta muestra su valor de TCGplayer/Cardmarket vía TCGdex. Actualizá los precios con un clic, con caché inteligente.'
  },
  {
    title: 'Cartas con efecto holo',
    description:
      'Los efectos de la carta real: holo, ultra, VMAX, arcoíris, radiante y más. Sin imágenes, puro CSS.'
  },
  {
    title: 'Búsqueda del catálogo completo',
    description:
      'Más de 17.000 cartas indexadas. Buscá por nombre, número o set y agregalas al instante.'
  },
  {
    title: 'Compartí tu colección',
    description:
      'Hacé un binder público y compartí el link con cualquiera, sin necesidad de cuenta para verlo.'
  },
  {
    title: 'Detalle completo en español',
    description:
      'Click en cualquier carta para ver ataques, habilidades, debilidad, retirada, ilustrador y legalidad.'
  }
]

const STEPS = [
  { n: '1', title: 'Creá tu cuenta', text: 'Gratis y sin verificación de email. En segundos tenés tu binder.' },
  { n: '2', title: 'Agregá tus cartas', text: 'Buscá en el catálogo completo de Pokémon TCG y poné cada carta en su bolsillo.' },
  { n: '3', title: 'Mirá su valor', text: 'Precios de mercado actualizados al toque, y el total de tu colección siempre visible.' }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Nav */}
      <nav className="border-b border-slate-800/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-binder-accent text-sm font-bold text-white">
              P
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Profesor TCG</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/explore"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Explorar
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Ingresar
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-binder-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Tu colección de Pokémon TCG,{' '}
              <span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">
                organizada y valorada
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-400">
              Armá binders virtuales con tus cartas, mirá el precio de mercado de cada una y
              compartí tu colección con quien quieras. Gratis, en español y con efectos holo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-xl bg-binder-accent px-6 py-3 text-base font-semibold text-white shadow-lg shadow-rose-900/30 transition-colors hover:bg-rose-500"
              >
                Crear mi binder gratis
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Sin tarjeta · Sin verificación de email · 17.000+ cartas
            </p>
          </div>

          {/* Demo de cartas */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {DEMO_CARDS.map((card) => (
              <div key={card.id} className="w-28 sm:w-36">
                <PokemonCard card={card} />
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="truncate font-medium text-slate-300">{card.card_name}</span>
                  {card.market_price != null && (
                    <span className="ml-2 shrink-0 font-bold text-yellow-400">
                      ${card.market_price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800/60 bg-slate-900/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Todo lo que necesitás para tu colección
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
            Pensado para coleccionistas: desde el precio de mercado hasta el efecto holo de cada carta.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700"
              >
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">Empezar es fácil</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-binder-accent/15 text-lg font-bold text-binder-accent">
                {s.n}
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-800/60 bg-slate-900/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Empezá a organizar tu colección hoy
          </h2>
          <p className="mt-3 text-slate-400">
            Creá tu primer binder en menos de un minuto.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-xl bg-binder-accent px-8 py-3 text-base font-semibold text-white shadow-lg shadow-rose-900/30 transition-colors hover:bg-rose-500"
          >
            Crear mi binder gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-600">
          Profesor TCG · Precios de mercado vía TCGdex · Efectos de cartas: pokemon-cards-css ·
          Íconos de tipos: pokemon-type-svg-icons
        </div>
      </footer>
    </div>
  )
}
