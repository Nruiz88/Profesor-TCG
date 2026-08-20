import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import FeaturesStatsBar from '@/components/FeaturesStatsBar'
import HeroBinderDemo from '@/components/HeroBinderDemo'
import CommunityStatsBar from '@/components/CommunityStatsBar'
import LiveMarketFeed from '@/components/LiveMarketFeed'
import LiveWantlistFeed from '@/components/LiveWantlistFeed'
import LiveActivityTicker from '@/components/LiveActivityTicker'
import TradeFairnessWidget from '@/components/TradeFairnessWidget'
import ClaimSimulator from '@/components/ClaimSimulator'
import GhostPokemon from '@/components/GhostPokemon'
import { createClient } from '@/lib/supabase/server'
import {
  CardsIcon,
  WalletIcon,
  SparklesIcon,
  SearchIcon,
  SwapIcon,
  GlobeIcon,
  ChatIcon,
  ArrowRightIcon
} from '@/components/icons'

const FEATURES = [
  {
    icon: CardsIcon,
    title: 'Binder virtual de 9 bolsillos',
    description:
      'Organizá tus cartas por hojas como en un binder de verdad, con carpetas para cada colección.',
    tag: '9 bolsillos por hoja',
    href: '/binder',
    cta: 'Armar mi binder',
    gradient: 'from-rose-500 to-orange-400',
    glow: 'hover:shadow-rose-500/15'
  },
  {
    icon: WalletIcon,
    title: 'Precios de mercado en vivo',
    description:
      'Cada carta muestra su valor de TCGplayer/Cardmarket vía TCGdex, con caché inteligente y actualización en un clic.',
    tag: 'TCGplayer · Cardmarket',
    href: '/explore',
    cta: 'Ver el mercado',
    gradient: 'from-emerald-500 to-teal-400',
    glow: 'hover:shadow-emerald-500/15'
  },
  {
    icon: SparklesIcon,
    title: 'Cartas con efecto holo',
    description:
      'Holo, ultra, VMAX, arcoíris, radiante y más: el efecto real de la carta, sin imágenes, puro CSS.',
    tag: 'Efectos CSS puros',
    href: '/binder',
    cta: 'Ver el efecto',
    gradient: 'from-amber-500 to-yellow-400',
    glow: 'hover:shadow-amber-500/15'
  },
  {
    icon: SearchIcon,
    title: 'Búsqueda del catálogo completo',
    description:
      'Más de 17.000 cartas indexadas. Buscá por nombre, número o set y agregalas al instante.',
    tag: '+17.000 cartas',
    href: '/explore',
    cta: 'Buscar cartas',
    gradient: 'from-sky-500 to-cyan-400',
    glow: 'hover:shadow-sky-500/15'
  },
  {
    icon: SwapIcon,
    title: 'Trueques 1 vs 1 con valores',
    description:
      'Proponé cambios comparando el valor de cada lado automáticamente, con o sin dinero extra.',
    tag: 'Ofertas con valor',
    href: '/explore',
    cta: 'Proponer un trueque',
    gradient: 'from-violet-500 to-purple-400',
    glow: 'hover:shadow-violet-500/15'
  },
  {
    icon: GlobeIcon,
    title: 'Detalle completo en español',
    description:
      'Click en cualquier carta para ver ataques, habilidades, debilidad, retirada, ilustrador y legalidad.',
    tag: 'Todo el detalle',
    href: '/explore',
    cta: 'Explorar detalles',
    gradient: 'from-fuchsia-500 to-pink-400',
    glow: 'hover:shadow-fuchsia-500/15'
  }
]

const STEPS = [
  {
    n: '1',
    icon: CardsIcon,
    title: 'Armá tu Binder 3D',
    text: 'Digitalizá tu álbum físico en minutos, con precios de mercado en tiempo real.',
    tag: '1 minuto',
    gradient: 'from-rose-500 to-orange-400',
    glow: 'hover:shadow-rose-500/15',
    href: '/login',
    cta: 'Empezar gratis'
  },
  {
    n: '2',
    icon: SwapIcon,
    title: 'Publicá o Intercambiá',
    text: 'Marcá tus cartas en venta o proponé cambios 1v1 comparando valores automáticamente.',
    tag: 'Venta o trueque',
    gradient: 'from-sky-500 to-cyan-400',
    glow: 'hover:shadow-sky-500/15',
    href: '/explore',
    cta: 'Ver el mercado'
  },
  {
    n: '3',
    icon: ChatIcon,
    title: 'Cerrá por WhatsApp',
    text: 'Generá tu kit de claim (texto o imagen 1080×1080), compartí el link y coordiná directo con el comprador, sin comisiones.',
    tag: 'Sin comisiones',
    gradient: 'from-emerald-500 to-teal-400',
    glow: 'hover:shadow-emerald-500/15',
    href: '/explore',
    cta: 'Ver un ejemplo'
  }
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-300">
      <GhostPokemon />
      {/* Nav */}
      <SiteNav
        active="home"
        initialUser={user ? { id: user.id, email: user.email ?? undefined } : null}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.12),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.08),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:pt-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-binder-accent/30 bg-binder-accent/10 px-3 py-1 text-xs font-semibold text-binder-accent">
              <SparklesIcon width={13} height={13} />
              Mercado P2P de cartas TCG · Gratis · Sin comisiones
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]">
              Comprá, vendé y cambiá cartas TCG{' '}
              <span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">
                directo por WhatsApp.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-400">
              TCG Claim es el mercado P2P de cartas coleccionables: digitalizá tu Binder 3D, publicá
              tus cartas con precio de mercado en vivo y cerrá el trato{' '}
              <span className="text-slate-200">sin comisiones ni intermediarios</span>.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-medium text-emerald-300">
              <ChatIcon width={15} height={15} />
              Vende en grupos de WhatsApp sin armar listas en texto
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-binder-accent px-6 py-3 text-base font-semibold text-white shadow-lg shadow-rose-900/30 transition-colors hover:bg-rose-500"
              >
                Crear mi Binder Gratis
                <ArrowRightIcon width={17} height={17} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-base font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
              >
                Explorar Mercado
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-600">
              Sin tarjeta · Sin verificación de email ·{' '}
              <Link href="/login" className="font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline">
                Ya tengo cuenta
              </Link>
            </p>
          </div>

          {/* Demo 3D interactiva */}
          <div className="relative mx-auto w-full max-w-md">
            <HeroBinderDemo />
          </div>
        </div>
      </section>

      {/* Ticker de actividad en vivo */}
      <LiveActivityTicker />

      {/* Métricas de la comunidad */}
      <CommunityStatsBar />

      {/* Marketplace en vivo */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-binder-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Actividad del mercado en vivo
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Últimas cartas publicadas en la comunidad
            </h2>
            <p className="mt-3 text-slate-400">
              Lo último que la comunidad publicó para vender o cambiar, con precio en vivo,
              vendedor con ubicación y contacto directo por WhatsApp.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-binder-accent hover:text-white"
          >
            Ver todo el mercado
            <ArrowRightIcon width={15} height={15} />
          </Link>
        </div>

        <div className="mt-10">
          <LiveMarketFeed />
        </div>
      </section>

      {/* Wantlist de la comunidad en vivo */}
      <section className="relative overflow-hidden border-t border-fuchsia-500/10 bg-slate-900/40 py-20 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(217,70,239,0.14),transparent_55%),radial-gradient(ellipse_at_top_left,rgba(168,85,247,0.1),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-300">
                <SparklesIcon width={13} height={13} />
                Wantlist de la comunidad
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Lo último que están{' '}
                <span className="bg-gradient-to-r from-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                  buscando
                </span>
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Cada coleccionista agrega a su Wantlist las cartas que le faltan. Si tenés alguna,
                ofrecé un <span className="font-semibold text-fuchsia-300">Swap por WhatsApp</span>{' '}
                en un clic y cerrá el trato directo.
              </p>
            </div>
            <Link
              href="/buscados"
              className="group inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/50 transition-all hover:-translate-y-0.5 hover:bg-fuchsia-500"
            >
              Ver todos los buscados
              <ArrowRightIcon
                width={17}
                height={17}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="mt-10">
            <LiveWantlistFeed />
          </div>
        </div>
      </section>

      {/* Simulador en vivo del WhatsApp Claim */}
      <section className="border-t border-slate-800/60 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Simulador en vivo
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
              Así de fácil se vende desde tu Binder 3D
            </h2>
            <p className="mt-3 text-slate-400">
              Un clic aplica la reserva de 24&nbsp;h y le abre el WhatsApp con el mensaje listo al
              comprador. Probá la simulación: la carta pasa a{' '}
              <span className="font-semibold text-amber-300">Reservada</span> y el vendedor recibe el
              claim al instante.
            </p>
          </div>
          <ClaimSimulator />
        </div>
      </section>

      {/* Calculadora de intercambio justo */}
      <section className="border-t border-slate-800/60 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <TradeFairnessWidget />
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden border-t border-slate-800/60 bg-slate-900/40 py-20 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.07),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-binder-accent">
              <SparklesIcon width={14} height={14} />
              Características
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Todo lo que necesitás para tu{' '}
              <span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">
                colección
              </span>
            </h2>
            <p className="mt-4 leading-relaxed text-slate-400">
              Pensado para coleccionistas: desde el precio de mercado hasta el efecto holo de cada
              carta, todo en un solo lugar y sin comisiones.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-2xl ${f.glow}`}
              >
                {/* Glow difuso de la esquina al hover */}
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${f.gradient} opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-25`}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-lg`}
                  >
                    <f.icon width={22} height={22} />
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {f.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.description}</p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-binder-accent transition-colors group-hover:text-rose-400">
                  {f.cta}
                  <ArrowRightIcon
                    width={15}
                    height={15}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>

          {/* Franja de stats: catálogo, coleccionistas y ofertas activas */}
          <FeaturesStatsBar />
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative overflow-hidden border-t border-slate-800/60 bg-slate-900/40 py-20 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(56,189,248,0.06),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-binder-accent">
              <SwapIcon width={14} height={14} />
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Del álbum físico al trato cerrado en{' '}
              <span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">
                3 pasos
              </span>
            </h2>
            <p className="mt-4 leading-relaxed text-slate-400">
              Digitalizá, publicá y cerrá el trato directo por WhatsApp: sin comisiones ni
              intermediarios.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <Link
                key={s.n}
                href={s.href}
                className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:shadow-2xl ${s.glow}`}
              >
                {/* Glow difuso de la esquina al hover */}
                <div
                  className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${s.gradient} opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-25`}
                  aria-hidden="true"
                />

                <div className="flex items-start justify-between gap-3">
                  <span className="relative">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg`}
                    >
                      <s.icon width={24} height={24} strokeWidth={1.7} />
                    </span>
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white shadow ring-1 ring-slate-700">
                      {s.n}
                    </span>
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-800/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    {s.tag}
                  </span>
                </div>

                <h3 className="mt-5 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{s.text}</p>

                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-binder-accent transition-colors group-hover:text-rose-400">
                  {s.cta}
                  <ArrowRightIcon
                    width={15}
                    height={15}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-800/60 bg-gradient-to-b from-slate-900/60 to-transparent py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Tu colección merece estar en 3D
          </h2>
          <p className="mt-3 text-slate-400">
            Creá tu primer binder en menos de un minuto y empezá a vender o cambiar hoy mismo.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-binder-accent px-8 py-3 text-base font-semibold text-white shadow-lg shadow-rose-900/30 transition-colors hover:bg-rose-500"
          >
            Crear mi Binder Gratis
            <ArrowRightIcon width={17} height={17} />
          </Link>
        </div>
      </section>

    </div>
  )
}
