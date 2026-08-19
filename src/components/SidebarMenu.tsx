'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CardsIcon,
  ChevronDownIcon,
  CompassIcon,
  FolderIcon,
  GearIcon,
  HomeIcon,
  LogoutIcon,
  PlusIcon,
  PokeballIcon,
  RefreshIcon,
  ShieldIcon,
  SwapIcon,
  UserIcon
} from '@/components/icons'
import { createClient } from '@/lib/supabase/client'
import NotificationsBell from './NotificationsBell'
import type { Profile } from '@/lib/profile'

export interface SidebarBinder {
  id: string
  title: string
  is_public?: boolean
}

export interface SidebarMenuProps {
  profile: Profile | null
  user: { id: string; email?: string } | null
  binders: SidebarBinder[]
  activeBinderId: string | null
  pendingOffers: number
  isActive: (p: string) => boolean
  onSelectBinder: (id: string) => void
  onCreateBinder: () => void
  onRefreshPrices: () => void
  updating: boolean
  onShowProfile: () => void
  onShowClaims: () => void
  onClose: () => void
  /** Muestra el encabezado de logo (se omite en el Bottom Sheet móvil). */
  showHeader?: boolean
}

const SECTION_TOGGLE =
  'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500'
const NAV_ITEM =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150'
const NAV_ACTIVE =
  'bg-gradient-to-r from-rose-500/25 via-rose-500/10 to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_rgba(244,63,94,0.18)] ring-1 ring-inset ring-rose-500/30'
const NAV_IDLE = 'text-slate-400 hover:bg-gray-800 hover:text-white'

export function SidebarSection({
  icon,
  title,
  defaultOpen = true,
  children
}: {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${SECTION_TOGGLE} mb-1 flex w-full items-center justify-between rounded-lg hover:bg-gray-800`}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-emerald-500">{icon}</span>
          {title}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            open ? '' : '-rotate-90'
          }`}
        />
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </section>
  )
}

/**
 * Menú de navegación compartido: la misma estructura y agrupaciones que se
 * renderizan en el sidebar de escritorio (AppSidebar) y en el Bottom Sheet
 * del menú móvil (BottomNav), para que ambos sean exactamente iguales:
 * Inicio/Perfil sueltos, y las secciones colapsables Binder, Mercado y
 * Herramientas, más el footer de sesión.
 */
export default function SidebarMenu(props: SidebarMenuProps) {
  const router = useRouter()
  const {
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
    onClose,
    showHeader = true
  } = props

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
      {showHeader && (
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-800/60 px-5">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-sm font-bold text-white shadow-lg shadow-rose-900/40">
              P
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Profesor TCG</span>
          </Link>
        </div>
      )}

      {/* ─── Navegación ─── */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {/* INICIO / PERFIL */}
        <div className="flex flex-col gap-0.5">
          <Link
            href="/"
            onClick={onClose}
            className={`${NAV_ITEM} ${isActive('/') ? NAV_ACTIVE : NAV_IDLE}`}
          >
            <HomeIcon
              className={`h-5 w-5 ${isActive('/') ? 'text-rose-300' : 'text-slate-500'}`}
            />
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
                className={`h-5 w-5 ${
                  isActive('/profile') ? 'text-rose-300' : 'text-slate-500'
                }`}
              />
              Perfil
            </Link>
          )}
        </div>

        {/* BINDER (con binders correspondientes) */}
        <SidebarSection icon={<CardsIcon className="h-5 w-5" />} title="Binder">
          {user && (
            <Link
              href="/binder"
              onClick={onClose}
              className={`${NAV_ITEM} ${
                isActive('/binder') && !activeBinderId ? NAV_ACTIVE : NAV_IDLE
              }`}
            >
              <CardsIcon
                className={`h-5 w-5 ${
                  isActive('/binder') && !activeBinderId ? 'text-rose-300' : 'text-slate-500'
                }`}
              />
              Mi Binder
            </Link>
          )}

          {user && binders.length > 0 && (
            <ul className="flex flex-col gap-0.5">
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
                        className={`h-5 w-5 shrink-0 ${
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

          {user && (
            <button
              onClick={() => {
                onCreateBinder()
                onClose()
              }}
              className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-gray-800 hover:text-emerald-300"
            >
              <PlusIcon className="h-5 w-5" />
              Crear nuevo binder
            </button>
          )}
        </SidebarSection>

        {/* MERCADO */}
        <SidebarSection icon={<CompassIcon className="h-5 w-5" />} title="Mercado">
          <Link
            href="/explore"
            onClick={onClose}
            className={`${NAV_ITEM} ${isActive('/explore') ? NAV_ACTIVE : NAV_IDLE}`}
          >
            <CompassIcon
              className={`h-5 w-5 ${
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
              className={`h-5 w-5 ${
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
                className={`h-5 w-5 ${
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
              <SwapIcon className="h-5 w-5 text-sky-400" />
              Mis transacciones
            </button>
          )}
        </SidebarSection>

        {/* HERRAMIENTAS */}
        {user && (
          <SidebarSection icon={<GearIcon className="h-5 w-5" />} title="Herramientas">
            <button
              onClick={() => {
                onRefreshPrices()
                onClose()
              }}
              disabled={updating}
              className={`${NAV_ITEM} ${NAV_IDLE} disabled:opacity-50`}
            >
              <RefreshIcon className="h-5 w-5 text-slate-500" />
              {updating ? 'Actualizando precios…' : 'Actualizar precios'}
            </button>
            <button onClick={onShowProfile} className={`${NAV_ITEM} ${NAV_IDLE}`}>
              <GearIcon className="h-5 w-5 text-slate-500" />
              Configuración
            </button>
            {admin && (
              <Link href="/admin" onClick={onClose} className={`${NAV_ITEM} ${NAV_IDLE}`}>
                <ShieldIcon className="h-5 w-5 text-violet-400" />
                Panel Admin
              </Link>
            )}
          </SidebarSection>
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
