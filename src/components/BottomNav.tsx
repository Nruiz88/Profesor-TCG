'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  CardsIcon,
  ChevronDownIcon,
  CompassIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  PlusIcon,
  PokeballIcon,
  RefreshIcon,
  ShieldIcon,
  SwapIcon,
  UserIcon,
  XIcon
} from '@/components/icons'
import type { ComponentType, SVGProps } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserBinders } from '@/lib/binders'

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

// Etiqueta de sección del Bottom Sheet (estética coherente con el sidebar).
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
      {children}
    </p>
  )
}

/**
 * Barra de navegación inferior fija (estilo FaceBinder): visible solo en
 * móviles/tablets (< lg). Los items principales quedan a la vista y el botón
 * central "Más" abre un Bottom Sheet (panel emergente desde abajo) con la
 * estructura completa del menú: GENERAL, MI COLECCIÓN/BINDER, MERCADO,
 * HERRAMIENTAS y SESIÓN. El panel se cierra deslizándolo hacia abajo, tocando
 * el fondo oscuro o con Escape, y tiene alto máximo con scroll interno.
 */
export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [profileHref, setProfileHref] = useState('/login')
  const [profileUsername, setProfileUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [binders, setBinders] = useState<Binder[]>([])
  const [pendingOffers, setPendingOffers] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [binderOpen, setBinderOpen] = useState(true)
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

  // Resolver username, admin y binders del usuario.
  useEffect(() => {
    if (!user) {
      setProfileHref('/login')
      setProfileUsername(null)
      setIsAdmin(false)
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
          setProfileUsername(data.profile.username)
          setProfileHref(`/profile/${encodeURIComponent(data.profile.username)}`)
        }
        setIsAdmin(!!data.profile?.is_admin)
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
    // Solo arrastrar hacia abajo; ignorar hacia arriba (deja que el scroll trabaje)
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

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMoreOpen(false)
    router.push('/')
    router.refresh()
  }

  async function updatePrices() {
    if (updating) return
    setUpdating(true)
    try {
      const res = await fetch('/api/prices', { method: 'POST' })
      if (!res.ok) throw new Error('Error')
    } catch {
      // silencioso
    } finally {
      setUpdating(false)
    }
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
  const labelClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

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
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-slate-800 bg-[#0a0c10] shadow-2xl transition-transform duration-100"
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

            {/* Cuerpo con scroll interno si no cabe */}
            <div className="overflow-y-auto px-2 pb-[calc(5rem+env(safe-area-inset-bottom))]">
              {/* GENERAL */}
              <SectionLabel>General</SectionLabel>
              <div className="mb-4 flex flex-col gap-0.5">
                <Link href="/" onClick={() => setMoreOpen(false)} className={labelClass(isActive('/'))}>
                  <HomeIcon className="h-5 w-5 text-slate-500" />
                  Inicio
                </Link>
                {profileUsername && (
                  <Link
                    href={profileHref}
                    onClick={() => setMoreOpen(false)}
                    className={labelClass(isActive('/profile'))}
                  >
                    <UserIcon className="h-5 w-5 text-slate-500" />
                    Perfil
                  </Link>
                )}
              </div>

              {/* MI COLECCIÓN / BINDER */}
              {user && (
                <>
                  <button
                    type="button"
                    onClick={() => setBinderOpen((v) => !v)}
                    aria-expanded={binderOpen}
                    className="mb-1.5 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500 hover:bg-gray-800"
                  >
                    <span className="flex items-center gap-2.5">
                      <CardsIcon className="h-4 w-4" />
                      Mi Colección / Binder
                    </span>
                    <ChevronDownIcon
                      className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                        binderOpen ? '' : '-rotate-90'
                      }`}
                    />
                  </button>
                  {binderOpen && (
                    <div className="mb-4 flex flex-col gap-0.5">
                      <Link
                        href="/binder"
                        onClick={() => setMoreOpen(false)}
                        className={labelClass(pathname === '/binder' && !binders.length)}
                      >
                        <CardsIcon className="h-5 w-5 text-slate-500" />
                        Mi Binder
                      </Link>
                      {binders.map((b) => (
                        <Link
                          key={b.id}
                          href={`/binder?binderId=${b.id}`}
                          onClick={() => setMoreOpen(false)}
                          className={`${labelClass(false)} pl-8`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-slate-600" />
                          <span className="min-w-0 flex-1 truncate">{b.title}</span>
                        </Link>
                      ))}
                      <Link
                        href="/binder"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-gray-800 hover:text-emerald-300"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Crear nuevo binder
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* MERCADO */}
              <SectionLabel>Mercado</SectionLabel>
              <div className="mb-4 flex flex-col gap-0.5">
                <Link
                  href="/explore"
                  onClick={() => setMoreOpen(false)}
                  className={labelClass(isActive('/explore'))}
                >
                  <CompassIcon className="h-5 w-5 text-slate-500" />
                  Explorar
                </Link>
                <Link
                  href="/buscados"
                  onClick={() => setMoreOpen(false)}
                  className={labelClass(isActive('/buscados'))}
                >
                  <PokeballIcon className="h-5 w-5 text-slate-500" />
                  Buscados
                </Link>
                {user && (
                  <Link
                    href="/offers"
                    onClick={() => setMoreOpen(false)}
                    className={labelClass(isActive('/offers'))}
                  >
                    <SwapIcon className="h-5 w-5 text-slate-500" />
                    Ofertas
                    {pendingOffers > 0 && (
                      <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        {pendingOffers > 9 ? '9+' : pendingOffers}
                      </span>
                    )}
                  </Link>
                )}
                {user && (
                  <Link
                    href="/binder"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
                  >
                    <SwapIcon className="h-5 w-5 text-sky-400" />
                    Mis Transacciones
                  </Link>
                )}
              </div>

              {/* HERRAMIENTAS */}
              {user && (
                <>
                  <SectionLabel>Herramientas</SectionLabel>
                  <div className="mb-4 flex flex-col gap-0.5">
                    <button
                      onClick={updatePrices}
                      disabled={updating}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-50"
                    >
                      <RefreshIcon className="h-5 w-5 text-slate-500" />
                      {updating ? 'Actualizando precios…' : 'Actualizar precios'}
                    </button>
                    <Link
                      href={profileHref}
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
                    >
                      <GearIcon className="h-5 w-5 text-slate-500" />
                      Configuración
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5"
                      >
                        <ShieldIcon className="h-5 w-5 text-violet-400" />
                        Panel Admin
                      </Link>
                    )}
                  </div>
                </>
              )}

              {/* SESIÓN */}
              <div className="my-2 h-px bg-slate-800" />
              {user ? (
                <button
                  onClick={logout}
                  className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-600/15 hover:text-red-300"
                >
                  <LogoutIcon className="h-5 w-5" />
                  Cerrar sesión
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMoreOpen(false)}
                  className="mb-2 flex w-full items-center justify-center rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
                >
                  Ingresar
                </Link>
              )}
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
