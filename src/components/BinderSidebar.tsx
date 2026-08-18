'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertIcon,
  ArrowRightIcon,
  CardsIcon,
  CheckIcon,
  FolderIcon,
  GearIcon,
  GlobeIcon,
  LockIcon,
  MenuIcon,
  PlusIcon,
  RefreshIcon,
  ShareIcon,
  ShieldIcon,
  SwapIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  WalletIcon,
  XIcon
} from '@/components/icons'
import { formatLocation, isProfileComplete, type Profile } from '@/lib/profile'
import { pokedexLevel } from '@/lib/pokedex'
import type { TrainerScore } from '@/lib/trainer'

interface SidebarBinder {
  id: string
  title: string
  is_public?: boolean
}

interface BinderSidebarProps {
  profile: Profile | null
  user: { email?: string; id: string } | null
  binders: SidebarBinder[]
  activeBinderId: string | null
  binder: SidebarBinder | null
  totalCards: number
  totalValue: number
  saleCount: number
  tradeCount: number
  updating: boolean
  /** Especies Pokémon capturadas en todos los binders + total del catálogo */
  pokedex?: { captured: number; total: number } | null
  /** Puntos de Entrenador (XP + rango) del usuario */
  trainer?: TrainerScore | null
  onSelectBinder: (binderId: string) => void
  onCreateBinder: () => void
  onEditBinder: () => void
  onTogglePublic: () => void
  onCopyShareLink: () => void
  onDeleteBinder: () => void
  onRefreshPrices: () => void
  onShowClaims: () => void
  onShowProfile: () => void
}

const MENU_BTN =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors'
const MENU_NEUTRAL = 'text-slate-300 hover:bg-white/5 hover:text-white'
const MENU_DANGER = 'text-slate-400 hover:bg-red-600/15 hover:text-red-300'

// Panel lateral del binder logueado: perfil, estadísticas, carpetas
// (colecciones), acciones de la carpeta activa y herramientas de cuenta.
// Responsive: en móvil/tablet se pliega detrás de un botón "Menú"; en
// escritorio (lg+) queda fijo a la izquierda con sticky.
export default function BinderSidebar({
  profile,
  user,
  binders,
  activeBinderId,
  binder,
  totalCards,
  totalValue,
  saleCount,
  tradeCount,
  updating,
  pokedex,
  trainer,
  onSelectBinder,
  onCreateBinder,
  onEditBinder,
  onTogglePublic,
  onCopyShareLink,
  onDeleteBinder,
  onRefreshPrices,
  onShowClaims,
  onShowProfile
}: BinderSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const initial = (profile?.username?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()
  const location = formatLocation(profile?.city ?? null, profile?.country ?? null)
  const displayName = profile?.username ? `@${profile.username}` : user?.email ?? 'Mi Binder'
  const profileUrl = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : null
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  function handleSelect(id: string) {
    setMobileOpen(false)
    onSelectBinder(id)
  }

  const statTiles = [
    { icon: CardsIcon, label: 'Cartas', value: String(totalCards), tone: 'text-slate-300' },
    { icon: WalletIcon, label: 'Valor', value: `$${fmt(totalValue)}`, tone: 'text-yellow-400' },
    { icon: TagIcon, label: 'En venta', value: String(saleCount), tone: 'text-emerald-400' },
    { icon: SwapIcon, label: 'Cambio', value: String(tradeCount), tone: 'text-sky-400' }
  ]

  return (
    <>
      {/* Barra compacta en móvil/tablet: resume perfil + carpeta y abre el menú */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-base font-bold text-white shadow-lg shadow-rose-900/40">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          {profileUrl ? (
            <Link
              href={profileUrl}
              className="block truncate text-sm font-semibold text-white transition-colors hover:text-rose-300"
              title="Ver mi perfil público"
            >
              {displayName}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          )}
          <p className="truncate text-xs text-slate-500">
            {binder?.title ?? `${totalCards} cartas`}
          </p>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          {mobileOpen ? <XIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          <span className="hidden sm:inline">{mobileOpen ? 'Cerrar' : 'Menú'}</span>
        </button>
      </div>

      {/* Panel lateral */}
      <aside className={mobileOpen ? 'mb-4 block lg:mb-0' : 'hidden lg:block'}>
        <div className="flex flex-col lg:sticky lg:top-20">
          <div className="overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/60 backdrop-blur-xl">
            {/* Perfil */}
            <div className="border-b border-slate-800/80 p-4">
              {profileUrl ? (
                <Link
                  href={profileUrl}
                  title="Ver mi perfil público"
                  className="group -m-1 flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-rose-400 text-base font-bold text-white shadow-lg shadow-rose-900/40">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white" title={displayName}>
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-slate-500" title={location || undefined}>
                      {location || 'Agregá tu ubicación'}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400/80 transition-colors group-hover:text-rose-300">
                      <ArrowRightIcon className="h-3 w-3" />
                      Ver perfil público
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-rose-400 text-base font-bold text-white shadow-lg shadow-rose-900/40">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white" title={displayName}>
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-slate-500" title={location || undefined}>
                      {location || 'Agregá tu ubicación'}
                    </p>
                  </div>
                </div>
              )}

              {!isProfileComplete(profile) && (
                <button
                  onClick={onShowProfile}
                  className="mt-3 flex w-full items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200 transition-colors hover:bg-amber-500/20"
                >
                  <AlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Completá tu perfil con un WhatsApp para poder vender y coordinar claims.
                  </span>
                </button>
              )}
            </div>

            {/* Estadísticas compactas 2×2 */}
            <div className="grid grid-cols-2 gap-px border-b border-slate-800/80 bg-slate-800/80">
              {statTiles.map((s) => (
                <div key={s.label} className="bg-slate-900/80 p-3">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-slate-500" />
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">
                      {s.label}
                    </p>
                  </div>
                  <p className={`mt-1 truncate text-sm font-bold ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Pokédex: especies capturadas en todos los binders (cosmético) */}
            {pokedex && pokedex.total > 0 && (
              <div className="border-b border-slate-800/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    <span className="text-sm leading-none">⚡</span>
                    Pokédex
                  </p>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {pokedexLevel(pokedex.captured).icon} {pokedexLevel(pokedex.captured).name}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">
                  {pokedex.captured}{' '}
                  <span className="text-xs font-medium text-slate-500">
                    de {pokedex.total} Pokémon capturados
                  </span>
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                    style={{ width: `${Math.min(100, (pokedex.captured / pokedex.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Puntos de Entrenador: XP + rango del usuario */}
            {trainer && (
              <div className="border-b border-slate-800/80 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    <span className="text-sm leading-none">🏆</span>
                    Entrenador
                  </p>
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-300">
                    {trainer.rank.icon} {trainer.rank.name}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-bold text-white">
                  {trainer.xp.toLocaleString('en-US')}{' '}
                  <span className="text-xs font-medium text-slate-500">XP acumuladas</span>
                </p>
                {trainer.nextRank && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-400"
                      style={{ width: `${Math.round(trainer.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Colecciones */}
            <div className="border-b border-slate-800/80 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Colecciones
                </p>
                <button
                  onClick={onCreateBinder}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
                  aria-label="Crear carpeta nueva"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Nuevo
                </button>
              </div>

              {binders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-800 px-3 py-4 text-center text-xs text-slate-500">
                  Todavía no tenés carpetas. Creá una para organizar tu colección.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {binders.map((b) => {
                    const active = b.id === activeBinderId
                    return (
                      <li key={b.id}>
                        <button
                          onClick={() => handleSelect(b.id)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-binder-accent/15 font-semibold text-rose-300 ring-1 ring-binder-accent/40'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <FolderIcon className="h-4 w-4 shrink-0 text-slate-500" />
                          <span className="min-w-0 flex-1 truncate">{b.title}</span>
                          {b.is_public ? (
                            <GlobeIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
                          ) : (
                            <LockIcon className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                          )}
                          {active && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-rose-400" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Acciones de la carpeta activa */}
            {binder && (
              <div className="border-b border-slate-800/80 p-3">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Acciones · {binder.title}
                </p>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={onCopyShareLink}
                    className={`${MENU_BTN} bg-binder-accent font-semibold text-white hover:bg-rose-500`}
                  >
                    <ShareIcon className="h-4 w-4" />
                    Compartir link
                  </button>
                  <button onClick={onEditBinder} className={`${MENU_BTN} ${MENU_NEUTRAL}`}>
                    <GearIcon className="h-4 w-4" />
                    Configurar carpeta
                  </button>
                  <button onClick={onTogglePublic} className={`${MENU_BTN} ${MENU_NEUTRAL}`}>
                    {binder.is_public ? (
                      <GlobeIcon className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <LockIcon className="h-4 w-4 text-slate-500" />
                    )}
                    {binder.is_public ? 'Hacer privado' : 'Hacer público'}
                  </button>
                  <button onClick={onDeleteBinder} className={`${MENU_BTN} ${MENU_DANGER}`}>
                    <TrashIcon className="h-4 w-4" />
                    Eliminar carpeta
                  </button>
                </div>
              </div>
            )}

            {/* Herramientas y cuenta */}
            <div className="p-3">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Herramientas
              </p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={onRefreshPrices}
                  disabled={updating || totalCards === 0}
                  className={`${MENU_BTN} ${MENU_NEUTRAL} disabled:opacity-50`}
                >
                  <RefreshIcon className="h-4 w-4" />
                  {updating ? 'Actualizando precios…' : 'Actualizar precios'}
                </button>
                <button onClick={onShowClaims} className={`${MENU_BTN} ${MENU_NEUTRAL}`}>
                  <SwapIcon className="h-4 w-4 text-sky-400" />
                  Mis transacciones
                </button>
                {profile?.is_admin && (
                  <a href="/admin" className={`${MENU_BTN} ${MENU_NEUTRAL}`}>
                    <ShieldIcon className="h-4 w-4 text-violet-400" />
                    Panel admin
                  </a>
                )}
                <button onClick={onShowProfile} className={`${MENU_BTN} ${MENU_NEUTRAL}`}>
                  <UserIcon className="h-4 w-4" />
                  Configurar perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}