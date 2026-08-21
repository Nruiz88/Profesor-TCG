'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/profile'
import { DiscordIcon } from '@/components/icons'

interface MarketNavProps {
  user: { id: string; email?: string } | null
  profile: Profile | null
}

const NAV_LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/binder', label: 'Binder' },
  { href: '/acerca', label: 'Acerca' }
] as const

export default function MarketNav({ user, profile }: MarketNavProps) {
  const pathname = usePathname()

  const profileUrl = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : null

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#0a0c10]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="mr-4 flex items-center gap-2">
          <img src="/brand/logo-invertido.png" alt="TCG Claim" className="h-8 w-auto" />
          <span className="hidden text-lg font-bold tracking-tight text-white sm:inline">
            TCG Claim
          </span>
        </Link>

        {/* Links de navegación */}
        <div className="flex items-center gap-1">
          {/* Perfil — se inserta antes de Binder */}
          {profileUrl && (
            <Link
              href={profileUrl}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname.startsWith('/profile')
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              Perfil
            </Link>
          )}

          {NAV_LINKS.filter(
            (link) => !(link.href === '/' && (pathname === '/' || pathname === '/v2'))
          ).map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-rose-500/15 text-rose-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Acciones a la derecha */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://discord.gg/NxuWmFKPuZ"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-[#5865F2] px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-[#4752c4]"
            title="Unite a la comunidad en Discord"
          >
            <DiscordIcon className="h-4 w-4" />
            <span className="hidden md:inline">Discord</span>
          </a>
          {user ? (
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              En línea
            </span>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
            >
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
