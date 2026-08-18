'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertIcon,
  ArrowRightIcon,
  CardsIcon,
  CheckIcon,
  ChatIcon,
  EditIcon,
  FolderIcon,
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
import { whatsAppLink } from '@/lib/profile'
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
  pokedex?: { captured: number; total: number } | null
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
  onShareWhatsApp?: () => void
  onShareWantlist?: () => void
}

const SECTION_LABEL =
  'mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500'
const ACTION_BTN =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors'

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
  onShowProfile,
  onShareWhatsApp,
  onShareWantlist
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

  const hasWhatsApp = !!profile?.whatsapp_number
  const binderPublic = !!binder?.is_public

  function handleSelect(id: string) {
    setMobileOpen(false)
    onSelectBinder(id)
  }

  return (
    <>
      {/* Barra compacta en móvil/tablet */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-base font-bold text-white shadow-lg shadow-rose-900/40">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          {profileUrl ? (
            <Link
              href={profileUrl}
              className="block truncate text-sm font-semibold text-white transition-colors hover:text-rose-300"
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

            {/* ─── Perfil ─── */}
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
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">
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
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="truncate text-xs text-slate-500">
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

            {/* ─── WhatsApp CTA: la acción más importante ─── */}
            {hasWhatsApp && (
              <div className="border-b border-slate-800/80 p-3">
                <p className={SECTION_LABEL}>📱 Compartir y vender</p>
                <div className="flex flex-col gap-2">
                  {/* CTA principal: WhatsApp del binder */}
                  {binderPublic && onShareWhatsApp && (
                    <button
                      onClick={onShareWhatsApp}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/50 transition-all hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-emerald-500/25"
                    >
                      <ChatIcon className="h-4 w-4" />
                      Compartir binder por WhatsApp
                    </button>
                  )}

                  {/* Compartir wantlist */}
                  {onShareWantlist && (
                    <button
                      onClick={onShareWantlist}
                      className={`${ACTION_BTN} border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20`}
                    >
                      <ShareIcon className="h-4 w-4" />
                      Compartir cartas buscadas
                    </button>
                  )}

                  {/* Toggle público/privado + link */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onTogglePublic}
                      className={`${ACTION_BTN} flex-1 border border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600 hover:text-white`}
                    >
                      {binderPublic ? (
                        <GlobeIcon className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <LockIcon className="h-4 w-4 text-slate-500" />
                      )}
                      {binderPublic ? 'Público' : 'Privado'}
                    </button>
                    <button
                      onClick={onCopyShareLink}
                      title="Copiar link al portapapeles"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sin WhatsApp: prompt para completar */}
            {!hasWhatsApp && (
              <div className="border-b border-slate-800/80 p-3">
                <button
                  onClick={onShowProfile}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-left transition-colors hover:bg-emerald-500/20"
                >
                  <ChatIcon className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">
                      Agregá tu WhatsApp
                    </p>
                    <p className="text-[11px] text-emerald-400/70">
                      Para que los compradores te contacten directo
                    </p>
                  </div>
                </button>
              </div>
            )}

            {/* ─── Stats resumen ─── */}
            <div className="grid grid-cols-2 gap-px border-b border-slate-800/80 bg-slate-800/80">
              {[
                { icon: CardsIcon, label: 'Cartas', value: String(totalCards), tone: 'text-slate-300' },
                { icon: WalletIcon, label: 'Valor', value: `$${fmt(totalValue)}`, tone: 'text-yellow-400' },
                { icon: TagIcon, label: 'En venta', value: String(saleCount), tone: 'text-emerald-400' },
                { icon: SwapIcon, label: 'Cambio', value: String(tradeCount), tone: 'text-sky-400' }
              ].map((s) => (
                <div key={s.label} className="bg-slate-900/80 p-3">
                  <div className="flex items-center gap-1.5">
                    <s.icon className="h-3.5 w-3.5 text-slate-500" />
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</p>
                  </div>
                  <p className={`mt-1 truncate text-sm font-bold ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* ─── Editar binder ─── */}
            {binder && (
              <div className="border-b border-slate-800/80 p-3">
                <p className={SECTION_LABEL}>✏️ Editar binder</p>
                <button
                  onClick={onEditBinder}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-rose-500/40 hover:text-white"
                >
                  <EditIcon className="h-4 w-4 text-rose-400" />
                  Configurar "{binder.title}"
                </button>
                <p className="mt-1.5 px-1 text-[10px] text-slate-600">
                  Título, portada, visibilidad y más
                </p>
              </div>
            )}

            {/* ─── Colecciones ─── */}
            <div className="border-b border-slate-800/80 p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className={SECTION_LABEL} style={{ marginBottom: 0 }}>
                  📁 Colecciones
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

            {/* ─── Herramientas y cuenta ─── */}
            <div className="p-3">
              <p className={SECTION_LABEL}>⚙️ Herramientas</p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={onRefreshPrices}
                  disabled={updating || totalCards === 0}
                  className={`${ACTION_BTN} text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-50`}
                >
                  <RefreshIcon className="h-4 w-4" />
                  {updating ? 'Actualizando precios…' : 'Actualizar precios'}
                </button>
                <button
                  onClick={onShowClaims}
                  className={`${ACTION_BTN} text-slate-300 hover:bg-white/5 hover:text-white`}
                >
                  <SwapIcon className="h-4 w-4 text-sky-400" />
                  Mis transacciones
                </button>
                {profile?.is_admin && (
                  <a
                    href="/admin"
                    className={`${ACTION_BTN} text-slate-300 hover:bg-white/5 hover:text-white`}
                  >
                    <ShieldIcon className="h-4 w-4 text-violet-400" />
                    Panel admin
                  </a>
                )}
                <button
                  onClick={onShowProfile}
                  className={`${ACTION_BTN} text-slate-300 hover:bg-white/5 hover:text-white`}
                >
                  <UserIcon className="h-4 w-4" />
                  Configurar perfil
                </button>
                {binder && (
                  <button
                    onClick={onDeleteBinder}
                    className={`${ACTION_BTN} text-slate-400 hover:bg-red-600/15 hover:text-red-300`}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Eliminar carpeta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
