'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CardsIcon,
  ChevronUpIcon,
  CompassIcon,
  GearIcon,
  HomeIcon,
  PokeballIcon,
  UserIcon
} from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import { getUserBinders } from '@/lib/binders'
import SidebarMenu, {
  type SidebarBinder,
  type SidebarMenuProps
} from '@/components/SidebarMenu'
import type { Profile } from '@/lib/profile'

interface ResponsiveNavProps {
  profile: Profile | null
  user: { id: string; email?: string } | null
  binders: SidebarBinder[]
  activeBinderId: string | null
  onSelectBinder: (id: string) => void
  onCreateBinder: () => void
  onShowProfile: () => void
  onShowClaims: () => void
}

function useActivePath() {
  const pathname = usePathname()
  return (p: string) => pathname === p || pathname.startsWith(`${p}/`)
}

/**
 * Navegación responsive con UN MISMO componente para web y mobile, cambiando
 * solo su posición y disposición con Tailwind:
 *
 * - Desktop (lg+): barra vertical fija a la izquierda (`fixed left-0 top-0
 *   h-full w-64 flex-col`) con el menú agrupado (SidebarMenu).
 * - Mobile (< lg): barra horizontal fija abajo (`fixed bottom-0 w-full
 *   flex-row`) con las categorías principales y sus íconos. Al tocar una
 *   categoría con sub-menús (Binder, Mercado, Herramientas) se despliega un
 *   panel flotante hacia arriba (popover `bottom-full mb-2`) con sus
 *   sub-opciones. Se cierra al tocar una opción o fuera del menú.
 */
export default function ResponsiveNav(props: ResponsiveNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(props.user)
  const [profile, setProfile] = useState<Profile | null>(props.profile)
  const [binders, setBinders] = useState<SidebarBinder[]>(props.binders)
  const [pendingOffers, setPendingOffers] = useState(0)
  const isActive = useActivePath()

  // Popover móvil: categoría abierta (null = cerrado)
  const [openPopover, setOpenPopover] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Sincronizar sesión en el cliente (auth de Supabase)
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

  useEffect(() => {
    setUser(props.user)
    setProfile(props.profile)
    setBinders(props.binders)
  }, [props.user, props.profile, props.binders])

  // Cargar perfil y binders si no vinieron por props
  useEffect(() => {
    if (!user || profile) return
    let active = true
    ;(async () => {
      try {
        const res = await fetch('/api/profile')
        const data = await res.json()
        if (active && data.profile?.username) setProfile(data.profile)
        const list = await getUserBinders(user.id)
        if (active) setBinders(list || [])
      } catch {
        // perfil o binders no disponibles
      }
    })()
    return () => {
      active = false
    }
  }, [user, profile])

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

  // Cerrar el popover al navegar
  useEffect(() => {
    setOpenPopover(null)
  }, [pathname])

  // Cerrar el popover al tocar fuera o con Escape
  useEffect(() => {
    if (!openPopover) return
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenPopover(null)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openPopover])

  const profileUrl = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : null

  const admin = !!profile?.is_admin

  const menuProps: SidebarMenuProps = {
    profile,
    user,
    binders,
    activeBinderId: props.activeBinderId,
    pendingOffers,
    isActive,
    onSelectBinder: props.onSelectBinder,
    onCreateBinder: props.onCreateBinder,
    onShowProfile: props.onShowProfile,
    onShowClaims: props.onShowClaims,
    onClose: () => {},
    showHeader: true
  }

  // ── Categorías para la barra móvil ─────────────────────────────────
  type MobileItem = { label: string; href?: string; onClick?: () => void; icon?: React.ReactNode; badge?: number }
  type MobileCategory = {
    id: string
    label: string
    icon: React.ReactNode
    href?: string
    items?: MobileItem[]
  }

  const mobileCategories: MobileCategory[] = [
    { id: 'inicio', label: 'Inicio', icon: <HomeIcon className="h-5 w-5" />, href: '/' },
    {
      id: 'perfil',
      label: 'Perfil',
      icon: <UserIcon className="h-5 w-5" />,
      href: profileUrl ?? '/login'
    },
    {
      id: 'binder',
      label: 'Binder',
      icon: <CardsIcon className="h-5 w-5" />,
      items: user
        ? [
            { label: 'Mi Binder', href: '/binder' },
            ...binders.map((b) => ({
              label: b.title,
              onClick: () => {
                setOpenPopover(null)
                props.onSelectBinder(b.id)
              }
            })),
            {
              label: 'Crear nuevo binder',
              href: '/binder',
              onClick: () => {
                setOpenPopover(null)
                props.onCreateBinder()
              }
            }
          ]
        : []
    },
    {
      id: 'mercado',
      label: 'Mercado',
      icon: <CompassIcon className="h-5 w-5" />,
      items: [
        { label: 'Explorar', href: '/explore' },
        { label: 'Buscados', href: '/buscados' },
        ...(user
          ? [
              { label: 'Ofertas', href: '/offers', badge: pendingOffers },
              {
                label: 'Mis Transacciones',
                onClick: () => {
                  setOpenPopover(null)
                  props.onShowClaims()
                }
              }
            ]
          : [])
      ]
    },
    {
      id: 'herramientas',
      label: 'Herramientas',
      icon: <GearIcon className="h-5 w-5" />,
      items: user
        ? [
            {
              label: 'Configuración',
              onClick: () => {
                setOpenPopover(null)
                props.onShowProfile()
              }
            },
            ...(admin
              ? [{ label: 'Panel Admin', href: '/admin' as const }]
              : [])
          ]
        : []
    }
  ]

  const activeCat = (href?: string) => (href ? isActive(href) : false)

  return (
    <>
      {/* ─── DESKTOP: barra vertical fija a la izquierda ─── */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-800/60 bg-[#0a0c10] lg:flex">
        <SidebarMenu {...menuProps} />
      </aside>

      {/* ─── MOBILE: barra horizontal fija abajo + popovers ─── */}
      <div className="lg:hidden">
        {/* Popover de sub-opciones hacia arriba */}
        {openPopover && (
          <div ref={popoverRef} className="fixed inset-x-0 bottom-20 z-50 px-3">
            {mobileCategories
              .filter((c) => c.id === openPopover)
              .map((cat) => (
                <div
                  key={cat.id}
                  className="mb-2 overflow-hidden rounded-2xl border border-slate-800 bg-[#0a0c10] shadow-2xl"
                >
                  <p className="border-b border-slate-800/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                    {cat.label}
                  </p>
                  <div className="flex flex-col p-1.5">
                    {(cat.items ?? []).map((item) => (
                      <ItemLink
                        key={item.label}
                        item={item}
                        onDone={() => setOpenPopover(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Barra inferior con categorías principales */}
        <nav
          aria-label="Navegación principal"
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-row items-stretch justify-around border-t border-gray-800 bg-zinc-900"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {mobileCategories.map((cat) => {
            const active = activeCat(cat.href) || (cat.items?.length ? openPopover === cat.id : false)
            const hasItems = (cat.items?.length ?? 0) > 0
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (hasItems) {
                    setOpenPopover((cur) => (cur === cat.id ? null : cat.id))
                  } else if (cat.href) {
                    router.push(cat.href)
                  }
                }}
                aria-expanded={hasItems ? openPopover === cat.id : undefined}
                aria-haspopup={hasItems ? 'menu' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="relative flex h-6 w-6 items-center justify-center">
                  {cat.icon}
                  {hasItems && <ChevronUpIcon className="absolute -bottom-0.5 right-0 h-3 w-3" />}
                </span>
                <span className="truncate px-1">{cat.label}</span>
                {cat.id === 'mercado' && pendingOffers > 0 && (
                  <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {pendingOffers > 9 ? '9+' : pendingOffers}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}

function ItemLink({
  item,
  onDone
}: {
  item: { label: string; href?: string; onClick?: () => void; icon?: React.ReactNode; badge?: number }
  onDone: () => void
}) {
  const className =
    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white'
  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={`${className} text-left`}>
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        ) : null}
      </button>
    )
  }
  if (item.href) {
    return (
      <Link href={item.href} onClick={onDone} className={className}>
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        ) : null}
      </Link>
    )
  }
  return null
}
