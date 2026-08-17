import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import HeroBinderDemo from '@/components/HeroBinderDemo'
import CommunityStatsBar from '@/components/CommunityStatsBar'
import LiveMarketFeed from '@/components/LiveMarketFeed'
import LiveActivityTicker from '@/components/LiveActivityTicker'
import TradeFairnessWidget from '@/components/TradeFairnessWidget'
import ClaimSimulator from '@/components/ClaimSimulator'
import { createClient } from '@/lib/supabase/server'
import {
  CardsIcon,
  WalletIcon,
  SparklesIcon,
  SearchIcon,
  SwapIcon,
  GlobeIcon,
  ChatIcon,
  InstagramIcon,
  GithubIcon,
  ArrowRightIcon
} from '@/components/icons'

const FEATURES = [
  {
    icon: CardsIcon,
    title: 'Binder virtual de 9 bolsillos',
    description:
      'Organizá tus cartas por hojas como en un binder de verdad, con múltiples carpetas para tus colecciones.'
  },
  {
    icon: WalletIcon,
    title: 'Precios de mercado en vivo',
    description:
      'Cada carta muestra su valor de TCGplayer/Cardmarket vía TCGdex. Actualizá los precios con un clic, con caché inteligente.'
  },
  {
    icon: SparklesIcon,
    title: 'Cartas con efecto holo',
    description:
      'Los efectos de la carta real: holo, ultra, VMAX, arcoíris, radiante y más. Sin imágenes, puro CSS.'
  },
  {
    icon: SearchIcon,
    title: 'Búsqueda del catálogo completo',
    description:
      'Más de 17.000 cartas indexadas. Buscá por nombre, número o set y agregalas al instante.'
  },
  {
    icon: SwapIcon,
    title: 'Trueques 1 vs 1 con valores',
    description:
      'Proponé cambios comparando el valor de cada lado automáticamente, con o sin dinero extra.'
  },
  {
    icon: GlobeIcon,
    title: 'Detalle completo en español',
    description:
      'Click en cualquier carta para ver ataques, habilidades, debilidad, retirada, ilustrador y legalidad.'
  }
]

const STEPS = [
  {
    n: '1',
    icon: CardsIcon,
    title: 'Armá tu Binder 3D',
    text: 'Digitalizá tu álbum físico en minutos, con precios de mercado en tiempo real.'
  },
  {
    n: '2',
    icon: SwapIcon,
    title: 'Publicá o Intercambiá',
    text: 'Marcá tus cartas en venta o proponé cambios 1v1 comparando valores automáticamente.'
  },
  {
    n: '3',
    icon: ChatIcon,
    title: 'Cerrá por WhatsApp',
    text: 'Generá tu kit de claim (texto o imagen 1080×1080), compartí el link y coordiná directo con el comprador, sin comisiones.'
  }
]

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
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
              Gratis · Español · 17.000+ cartas
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]">
              Tu Colección TCG en 3D.{' '}
              <span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">
                Tu Mercado en WhatsApp.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-400">
              Digitalizá tu álbum físico en minutos: precios de mercado en tiempo real, cartas con
              efecto holo, y la comunidad para{' '}
              <span className="text-slate-200">vender, cambiar y cerrar el trato directo por WhatsApp</span>.
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
      <section className="border-t border-slate-800/60 bg-slate-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white">
            Todo lo que necesitás para tu colección
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
            Pensado para coleccionistas: desde el precio de mercado hasta el efecto holo de cada
            carta.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-600"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-binder-accent/10 text-binder-accent">
                  <f.icon width={20} height={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          Del álbum físico al trato cerrado en 3 pasos
        </h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-binder-accent/30 bg-binder-accent/10 text-binder-accent">
                <s.icon width={26} height={26} strokeWidth={1.7} />
                <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-binder-accent text-xs font-bold text-white shadow-lg shadow-rose-900/40">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              {s.n !== '3' && (
                <span className="absolute right-[-28px] top-8 hidden text-slate-700 sm:block">
                  <ArrowRightIcon width={22} height={22} />
                </span>
              )}
            </div>
          ))}
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

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-binder-accent text-sm font-bold text-white">
                P
              </span>
              <span className="text-lg font-bold tracking-tight text-white">Profesor TCG</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
              Tu colección TCG en 3D, tu mercado en WhatsApp. Digitalizá, publicá y comerciá con
              coleccionistas.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Producto</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/explore" className="text-slate-400 transition-colors hover:text-white">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-slate-400 transition-colors hover:text-white">
                  Binders destacados
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                  Crear cuenta
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                  Ingresar
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Legal</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="#" className="text-slate-400 transition-colors hover:text-white">
                  Términos de uso
                </Link>
              </li>
              <li>
                <Link href="#" className="text-slate-400 transition-colors hover:text-white">
                  Política de privacidad
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Comunidad</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
                >
                  <ChatIcon width={15} height={15} /> WhatsApp
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Nruiz88/Profesor-TCG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
                >
                  <GithubIcon width={15} height={15} /> GitHub
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
                >
                  <InstagramIcon width={15} height={15} /> Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/60 py-6">
          <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} Profesor TCG · Hecho con ❤️ para coleccionistas
          </div>
        </div>
      </footer>
    </div>
  )
}
