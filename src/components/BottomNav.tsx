'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CardsIcon,
  CompassIcon,
  HomeIcon,
  PokeballIcon,
  UserIcon,
  XIcon
} from '@/components/icons'
import type { ComponentType, SVGProps } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserBinders } from '@/lib/binders'
import SidebarMenu, { type SidebarMenuProps } from '@/components/SidebarMenu'
import type { Profile } from '@/lib/profile'

type IconProps = SVGProps<SVGSVGElement>

interface BottomNavItem {
  label: string
  icon: ComponentType<IconProps>
  href: string
  isActive: (p: string) => boolean
}

interface Binder {
  id: string
  title: string
  is_public?: boolean
}

/**
 * Barra de navegación inferior fija (estilo FaceBinder): visible solo en
 * móviles/tablets (< lg). Los items principales quedan a la vista y el botón
 * central "Más" abre un Bottom Sheet (panel emergente desde abajo) que
 * renderiza el MISMO menú del sidebar de escritorio (SidebarMenu), con las
 * mismas agrupaciones y desplegación. Se cierra deslizándolo hacia abajo,
 * tocando el fondo oscuro o con Escape, y tiene alto máximo con scroll.
 */
export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [profileHref, setProfileHref] = useState('/login')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [binders, setBinders] = useState<Binder[]>([])
  const [pendingOffers, setPendingOffers] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement | null>(null)

  // Gestión del gesto de deslizar hacia abajo para cerrar el panel.
  const dragStartY = useRef<number | null>(null)
  const dragOffset = useRef<number>(0)
  const [dragPx, setDragPx] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(
        session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null
      )
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Resolver perfil y binders del usuario.
  useEffect(() => {
    if (!user) {
      setProfileHref('/login')
      setProfile(null)
      setBinders([])
      return
    }
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        const data = await res.json()
        if (!active) return
        if (data.profile?.username) {
          setProfile(data.profile)
          setProfileHref(`/profile/${encodeURIComponent(data.profile.username)}`)
        }
        const list = await getUserBinders(user.id)
        if (active) setBinders(list || [])
      } catch {
        // perfil o binders no disponibles
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  // Badge de ofertas pendientes
  useEffect(() => {
    if (!user) {
      setPendingOffers(0)
      return
    }
    let active = true
    fetch('/api/offers/count')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (active) setPendingOffers(data.pending ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.id, pathname])

  // Cerrar el panel al navegar y con Escape
  useEffect(() => {
    setMoreOpen(false)
    setDragPx(0)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [moreOpen])

  // ── Gesto de arrastre del Bottom Sheet ─────────────────────────────
  function onDragStart(clientY: number) {
    dragStartY.current = clientY
    dragOffset.current = 0
  }
  function onDragMove(clientY: number) {
    if (dragStartY.current === null) return
    const delta = clientY - dragStartY.current
    if (delta > 0) {
      dragOffset.current = delta
      setDragPx(Math.min(delta, 240))
    }
  }
  function onDragEnd() {
    dragStartY.current = null
    if (dragOffset.current > 110) {
      setMoreOpen(false)
    }
    setDragPx(0)
  }

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
      label: 'Binder',
      icon: CardsIcon,
      href: '/binder',
      isActive: (p) => p === '/binder' || p.startsWith('/binder/') || p.startsWith('/b/')
    },
    {
      label: 'Market',
      icon: CompassIcon,
      href: '/explore',
      isActive: (p) => p.startsWith('/explore')
    },
    {
      label: 'Buscados',
      icon: PokeballIcon,
      href: '/buscados',
      isActive: (p) => p.startsWith('/buscados')
    }
  ]

  const isActive = (p: string) => pathname === p || pathname.startsWith(`${p}/`)

  const menuProps: SidebarMenuProps = {
    profile,
    user,
    binders,
    activeBinderId: null,
    pendingOffers,
    isActive,
    onSelectBinder: (id) => {
      router.push(`/binder?binderId=${id}`)
    },
    onCreateBinder: () => {
      router.push('/binder')
    },
    onRefreshPrices: async () => {
      if (updating) return
      setUpdating(true)
      try {
        await fetch('/api/prices', { method: 'POST' })
      } catch {
        // silencioso
      } finally {
        setUpdating(false)
      }
    },
    updating,
    onShowProfile: () => {
      if (profile?.username) {
        router.push(`/profile/${encodeURIComponent(profile.username)}?tab=settings`)
      }
    },
    onShowClaims: () => {
      router.push('/binder')
    },
    onClose: () => setMoreOpen(false),
    showHeader: false
  }

  return (
    <>
      {/* ─── Bottom Sheet del menú (solo móvil) ─── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={moreRef}
            style={{ transform: `translateY(${dragPx}px)` }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-800 bg-[#0a0c10] shadow-2xl transition-transform duration-100"
          >
            {/* Handle de arrastre: deslizar hacia abajo cierra el panel */}
            <div
              className="flex shrink-0 cursor-grab touch-none flex-col items-center py-3 active:cursor-grabbing"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                onDragStart(e.clientY)
              }}
              onPointerMove={(e) => onDragMove(e.clientY)}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Encabezado */}
            <div className="mb-1 flex shrink-0 items-center justify-between px-4 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">Menú</h2>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mismo menú que el sidebar de escritorio */}
            <div className="min-h-0 flex-1 overflow-hidden">
              <SidebarMenu {...menuProps} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Barra inferior fija ─── */}
      <nav
        aria-label="Navegación principal"
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-800 bg-[#090d16] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid w-full grid-cols-5">
          {items.map(({ label, icon: Icon, href, isActive: itemActive }) => {
            const active = itemActive(pathname)
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

          {/* Botón central "Más" */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label={moreOpen ? 'Cerrar menú' : 'Abrir menú'}
            className={`relative flex flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors duration-150 ${
              moreOpen ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              {moreOpen && (
                <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.8)]" />
              )}
              <MenuDotsIcon
                className={`h-5 w-5 ${
                  moreOpen
                    ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]'
                    : 'text-slate-500'
                }`}
              />
            </span>
            Más
          </button>
        </div>
      </nav>
    </>
  )
}

function MenuDotsIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
