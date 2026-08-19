'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CardsIcon,
  CompassIcon,
  FolderIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
  PokeballIcon,
  RefreshIcon,
  ShieldIcon,
  SwapIcon,
  UserIcon,
  XIcon
} from '@/components/icons'
import NotificationsBell from './NotificationsBell'
import type { Profile } from '@/lib/profile'

interface SidebarBinder {
  id: string
  title: string
  is_public?: boolean
}

interface AppSidebarProps {
  profile: Profile | null
  user: { id: string; email?: string } | null
  binders: SidebarBinder[]
  activeBinderId: string | null
  onSelectBinder: (id: string) => void
  onCreateBinder: () => void
  onRefreshPrices: () => void
  updating: boolean
  onShowProfile: () => void
  onShowClaims: () => void
}

const SECTION_LABEL = 'mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-emerald-400/50'
const NAV_ITEM =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150'
const NAV_ACTIVE =
  'bg-gradient-to-r from-rose-500/25 via-rose-500/10 to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_rgba(244,63,94,0.18)] ring-1 ring-inset ring-rose-500/30'
const NAV_IDLE = 'text-slate-400 hover:bg-white/5 hover:text-white'

function useActivePath() {
  const pathname = usePathname()
  return (p: string) => pathname === p || pathname.startsWith(`${p}/`)
}

function SidebarContent({
  profile,
  user,
  binders,
  activeBinderId,
  pendingOffers,
  isActive,
  onSelectBinder,
  onCreateBinder,
  onRefreshPrices,
  updating,
  onShowProfile,
  onShowClaims,
  onClose
}: AppSidebarProps & {
  pendingOffers: number
  isActive: (p: string) => boolean
  onClose: () => void
}) {
  const router = useRouter()
  const initial = (profile?.username?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const displayName = profile?.username ? `@${profile.username}` : user?.email ?? 'Mi Binder'
  const profileUrl = profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : null
  const admin = !!profile?.is_admin

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    onClose()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex h-full flex-col">
      {/* ─── Header: logo ─── */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-800/60 px-5">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-sm font-bold text-white shadow-lg shadow-rose-900/40">
            P
          </span>
          <span className="text-lg font-bold tracking-tight text-white">Profesor TCG</span>
        </Link>
      </div>

      {/* ─── Navegación ─── */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {/* GENERAL */}
        <section>
          <p className={SECTION_LABEL}>General</p>
          <div className="flex flex-col gap-0.5">
            <Link
              href="/"
              onClick={onClose}
              className={`${NAV_ITEM} ${isActive('/') ? NAV_ACTIVE : NAV_IDLE}`}
            >
              <HomeIcon className={`h-4 w-4 ${isActive('/') ? 'text-rose-300' : 'text-slate-500'}`} />
              Inicio
            </Link>
            {profileUrl && (
              <Link
                href={profileUrl}
                onClick={onClose}
                className={`${NAV_ITEM} ${
                  isActive('/profile') ? NAV_ACTIVE : NAV_IDLE
                }`}
              >
                <UserIcon
                  className={`h-4 w-4 ${
                    isActive('/profile') ? 'text-rose-300' : 'text-slate-500'
                  }`}
                />
                Perfil
              </Link>
            )}
          </div>
        </section>

        {/* MI COLECCIÓN */}
        {user && (
          <section>
            <p className={SECTION_LABEL}>Mi colección</p>
            <div className="flex flex-col gap-0.5">
              <Link
                href="/binder"
                onClick={onClose}
                className={`${NAV_ITEM} ${
                  isActive('/binder') && !activeBinderId ? NAV_ACTIVE : NAV_IDLE
                }`}
              >
                <CardsIcon
                  className={`h-4 w-4 ${
                    isActive('/binder') && !activeBinderId ? 'text-rose-300' : 'text-slate-500'
                  }`}
                />
                Mi Binder
              </Link>
            </div>

            {binders.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {binders.map((b) => {
                  const active = b.id === activeBinderId
                  return (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          onSelectBinder(b.id)
                          onClose()
                        }}
                        aria-current={active ? 'page' : undefined}
                        className={`${NAV_ITEM} w-full text-left ${
                          active ? NAV_ACTIVE : NAV_IDLE
                        } ${active ? '' : 'pl-8'}`}
                      >
                        <FolderIcon
                          className={`h-4 w-4 shrink-0 ${
                            active ? 'text-rose-300' : 'text-slate-500'
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate">{b.title}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              onClick={() => {
                onCreateBinder()
                onClose()
              }}
              className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <PlusIcon className="h-4 w-4" />
              Crear nuevo binder
            </button>
          </section>
        )}

        {/* MERCADO */}
        <section>
          <p className={SECTION_LABEL}>Mercado</p>
          <div className="flex flex-col gap-0.5">
            <Link
              href="/explore"
              onClick={onClose}
              className={`${NAV_ITEM} ${isActive('/explore') ? NAV_ACTIVE : NAV_IDLE}`}
            >
              <CompassIcon
                className={`h-4 w-4 ${
                  isActive('/explore') ? 'text-rose-300' : 'text-slate-500'
                }`}
              />
              Explorar
            </Link>
            <Link
              href="/buscados"
              onClick={onClose}
              className={`${NAV_ITEM} ${isActive('/buscados') ? NAV_ACTIVE : NAV_IDLE}`}
            >
              <PokeballIcon
                className={`h-4 w-4 ${
                  isActive('/buscados') ? 'text-rose-300' : 'text-slate-500'
                }`}
              />
              Buscados
            </Link>
            {user && (
              <Link
                href="/offers"
                onClick={onClose}
                className={`${NAV_ITEM} ${isActive('/offers') ? NAV_ACTIVE : NAV_IDLE}`}
              >
                <SwapIcon
                  className={`h-4 w-4 ${
                    isActive('/offers') ? 'text-rose-300' : 'text-slate-500'
                  }`}
                />
                Ofertas
                {pendingOffers > 0 && (
                  <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {pendingOffers > 9 ? '9+' : pendingOffers}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <button
                onClick={() => {
                  onShowClaims()
                  onClose()
                }}
                className={`${NAV_ITEM} ${NAV_IDLE}`}
              >
                <SwapIcon className="h-4 w-4 text-sky-400" />
                Mis transacciones
              </button>
            )}
          </div>
        </section>

        {/* HERRAMIENTAS */}
        {user && (
          <section>
            <p className={SECTION_LABEL}>Herramientas</p>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => {
                  onRefreshPrices()
                  onClose()
                }}
                disabled={updating}
                className={`${NAV_ITEM} ${NAV_IDLE} disabled:opacity-50`}
              >
                <RefreshIcon className="h-4 w-4 text-slate-500" />
                {updating ? 'Actualizando precios…' : 'Actualizar precios'}
              </button>
              <button onClick={onShowProfile} className={`${NAV_ITEM} ${NAV_IDLE}`}>
                <GearIcon className="h-4 w-4 text-slate-500" />
                Configuración
              </button>
              {admin && (
                <Link href="/admin" onClick={onClose} className={`${NAV_ITEM} ${NAV_IDLE}`}>
                  <ShieldIcon className="h-4 w-4 text-violet-400" />
                  Panel Admin
                </Link>
              )}
            </div>
          </section>
        )}
      </nav>

      {/* ─── Footer: perfil del usuario ─── */}
      <div className="shrink-0 border-t border-slate-800/60 p-3">
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-base font-bold text-white shadow-lg shadow-rose-900/40">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white" title={user.email}>
                {displayName}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                En línea
              </p>
            </div>
            <NotificationsBell />
            <button
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-600/15 hover:text-red-300"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
          >
            Ingresar
          </Link>
        )}
      </div>
    </div>
  )
}

/**
 * Barra lateral fija (estilo dashboard): reemplaza el header superior y el
 * panel lateral del binder. Contiene la navegación completa agrupada por
 * secciones y el perfil del usuario en el footer. En mobile se pliega como
 * drawer desde la izquierda.
 */
export default function AppSidebar(props: AppSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(props.user)
  const [pendingOffers, setPendingOffers] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const isActive = useActivePath()

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
  }, [props.user])

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

  // Cerrar drawer al navegar y con Escape / clic afuera
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const close = () => setMobileOpen(false)

  return (
    <>
      {/* Barra superior en mobile: logo + hamburguesa */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800/60 bg-[#090d16]/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-sm font-bold text-white shadow-lg shadow-rose-900/40">
            P
          </span>
          <span className="text-base font-bold tracking-tight text-white">Profesor TCG</span>
        </Link>
        <div className="flex items-center gap-2">
          {user && <NotificationsBell />}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {mobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className="absolute inset-y-0 left-0 w-[19rem] max-w-[85vw] border-r border-slate-800 bg-[#0a0c10] shadow-2xl"
          >
            <SidebarContent
              {...props}
              user={user}
              pendingOffers={pendingOffers}
              isActive={isActive}
              onClose={close}
            />
          </div>
        </div>
      )}

      {/* Sidebar fijo en desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-800/60 bg-[#0a0c10] lg:block">
        <SidebarContent
          {...props}
          user={user}
          pendingOffers={pendingOffers}
          isActive={isActive}
          onClose={() => {}}
        />
      </aside>
    </>
  )
}