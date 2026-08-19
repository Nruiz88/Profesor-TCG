'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CardsIcon,
  CompassIcon,
  HomeIcon,
  PokeballIcon,
  UserIcon
} from '@/components/icons'
import type { ComponentType, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

interface BottomNavItem {
  label: string
  icon: ComponentType<IconProps>
  href: string
  isActive: (p: string) => boolean
}

/**
 * Barra de navegación inferior fija (estilo FaceBinder): visible solo en
 * móviles/tablets (< lg). En desktop queda oculta, ya que navega el sidebar.
 */
export default function BottomNav() {
  const pathname = usePathname()
  const [profileHref, setProfileHref] = useState('/login')

  // Resolver el username del perfil para el item "Perfil". Sin sesión o sin
  // username queda apuntando a /login (donde el usuario puede completarlo).
  useEffect(() => {
    let active = true
    fetch('/api/profile')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (active && data.profile?.username) {
          setProfileHref(`/profile/${encodeURIComponent(data.profile.username)}`)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const items: BottomNavItem[] = [
    {
      label: 'Inicio',
      icon: HomeIcon,
      href: '/',
      isActive: (p) => p === '/'
    },
    {
      label: 'Perfil',
      icon: UserIcon,
      href: profileHref,
      isActive: (p) => p.startsWith('/profile')
    },
    {
      label: 'Inventario',
      icon: CardsIcon,
      href: '/binder',
      isActive: (p) => p === '/binder' || p.startsWith('/binder/') || p.startsWith('/b/')
    },
    {
      label: 'Interactivo',
      icon: PokeballIcon,
      href: '/buscados',
      isActive: (p) => p.startsWith('/buscados')
    },
    {
      label: 'Market',
      icon: CompassIcon,
      href: '/explore',
      isActive: (p) => p.startsWith('/explore')
    }
  ]

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-[#090d16] lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid w-full grid-cols-5">
        {items.map(({ label, icon: Icon, href, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
                active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative flex h-5 w-5 items-center justify-center">
                {active && (
                  <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.8)]" />
                )}
                <Icon
                  className={`h-5 w-5 ${
                    active
                      ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]'
                      : 'text-slate-500'
                  }`}
                />
              </span>
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}