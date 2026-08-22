'use client'

import { usePathname, useRouter } from 'next/navigation'
import { CardsIcon, HomeIcon, UserIcon } from '@/components/icons'
import type { Profile } from '@/lib/profile'

interface MobileNavProps {
  user: { id: string; email?: string } | null
  profile: Profile | null
}

/**
 * Barra de navegación inferior SOLO mobile (< lg). Las opciones dependen de la
 * sesión: con usuario muestra Binder y Perfil; sin sesión muestra Ingresar.
 * El header (MarketNav) queda oculto en mobile; este es el único menú ahí.
 */
export default function MobileNav({ user, profile }: MobileNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const profileUrl = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : null

  const itemClass = (active: boolean) =>
    `relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
      active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
    }`

  const iconBox = (icon: React.ReactNode) => (
    <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
  )

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-row items-stretch justify-around border-t border-gray-800 bg-zinc-900 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={() => router.push('/')}
        className={itemClass(pathname === '/')}
      >
        {iconBox(<HomeIcon className="h-5 w-5" />)}
        <span>Inicio</span>
      </button>

      {user ? (
        <>
          <button
            type="button"
            onClick={() => router.push('/binder')}
            className={itemClass(pathname === '/binder')}
          >
            {iconBox(<CardsIcon className="h-5 w-5" />)}
            <span>Binder</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(profileUrl ?? '/binder')}
            className={itemClass(pathname.startsWith('/profile'))}
          >
            {iconBox(<UserIcon className="h-5 w-5" />)}
            <span>Perfil</span>
          </button>
        </>
      ) : (
        <button type="button" onClick={() => router.push('/login')} className={itemClass(false)}>
          {iconBox(<UserIcon className="h-5 w-5" />)}
          <span>Ingresar</span>
        </button>
      )}
    </nav>
  )
}