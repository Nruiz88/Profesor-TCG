import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import GhostPokemon from '@/components/GhostPokemon'
import { SearchIcon, DiscordIcon } from '@/components/icons'

// Página 404 personalizada (status 404 real, sin redirección). Muestra
// enlaces para seguir navegando y evitar el rebote del usuario.
export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-300">
      <GhostPokemon />
      <SiteNav active="home" />

      <main className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.06),transparent_55%)]" />

        <p className="text-xs font-bold uppercase tracking-widest text-binder-accent">
          Error 404
        </p>
        <h1 className="mt-3 text-7xl font-extrabold tracking-tight text-white sm:text-8xl">
          4<span className="bg-gradient-to-r from-binder-accent to-amber-400 bg-clip-text text-transparent">0</span>4
        </h1>
        <p className="mt-4 text-xl font-semibold text-white">Esta carta no está en el set</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          La página que buscás no existe o fue movida. Volvé al mercado o preguntá por la carta en
          la comunidad.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-binder-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
          >
            Volver al inicio
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            <SearchIcon className="h-4 w-4" />
            Explorar el mercado
          </Link>
          <a
            href="https://discord.gg/NxuWmFKPuZ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-[#4752c4]"
          >
            <DiscordIcon className="h-4 w-4" />
            Preguntar en Discord
          </a>
        </div>
      </main>
    </div>
  )
}