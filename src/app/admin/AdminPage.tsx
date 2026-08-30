'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ActivityIcon,
  ArrowRightIcon,
  CardsIcon,
  ChartIcon,
  ClockIcon,
  FolderIcon,
  GlobeIcon,
  KeyIcon,
  LockIcon,
  RefreshIcon,
  ShieldIcon,
  SwapIcon,
  UserIcon,
  WalletIcon
} from '@/components/icons'
import { formatLocation } from '@/lib/profile'
import AdminIntegrations from '@/components/AdminIntegrations'
import AdminActivityChart from '@/components/AdminActivityChart'
import { computeTrainerScore } from '@/lib/trainer'

interface UserRow {
  id: string
  username: string
  city: string | null
  country: string | null
  created_at: string
  is_admin: boolean
  is_verified: boolean
  is_premium: boolean
  binderCount: number
  hasPublicBinder: boolean
  cardCount: number
  saleCount: number
  tradeCount: number
}

interface Overview {
  generatedAt: string
  users: {
    total: number
    new14d: number
    verified: number
    rows: UserRow[]
  }
  cards: { total: number; forSale: number; forTrade: number; reserved: number; collection: number }
  binders: { total: number; public: number }
  offers: { total: number; pending: number; accepted: number; rejected: number; cancelled: number }
  marketValue: number
  recent: Array<{
    card_name: string
    set_id: string
    number: string
    status: string
    is_for_sale: boolean
    is_for_trade: boolean
    price: number | null
    updated_at: string
    username: string
  }>
  activity: Array<{ date: string; count: number }>
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtNum = (n: number) => n.toLocaleString('es-AR')

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    collection: 'bg-slate-700/50 text-slate-300',
    for_sale: 'bg-emerald-500/15 text-emerald-400',
    for_trade: 'bg-sky-500/15 text-sky-400',
    reserved: 'bg-amber-500/15 text-amber-400'
  }
  const label: Record<string, string> = {
    collection: 'Colección',
    for_sale: 'En venta',
    for_trade: 'Para cambio',
    reserved: 'Reservada'
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[status] || map.collection}`}>
      {label[status] || status}
    </span>
  )
}

function pageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('…')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('…')
  pages.push(total)
  return pages
}

const PAGE_SIZE = 15

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'activity' | 'integrations'>('users')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userRows, setUserRows] = useState<UserRow[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPages, setUserPages] = useState(1)
  const [usersLoading, setUsersLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/overview')
      const body = await res.json()
      if (!res.ok) {
        setError(body.error || 'Error desconocido')
        setData(null)
      } else {
        setData(body)
      }
    } catch {
      setError('Error de red al cargar el panel')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const loadUsers = useCallback(async (p: number, s: string) => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
      if (s.trim()) params.set('search', s.trim())
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const body = await res.json()
      if (res.ok) {
        setUserRows(body.rows ?? [])
        setUserTotal(body.total ?? 0)
        setUserPages(body.totalPages ?? 1)
      } else {
        setUserRows([])
        setUserTotal(0)
        setUserPages(1)
      }
    } catch {
      setUserRows([])
      setUserTotal(0)
      setUserPages(1)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => { setPage(1) }, [search])

  useEffect(() => {
    const t = setTimeout(() => loadUsers(page, search), 250)
    return () => clearTimeout(t)
  }, [page, search, data, loadUsers])

  async function handleVerify(u: { id: string; username: string; is_verified: boolean }) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id, is_verified: !u.is_verified })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error')
      loadUsers(page, search)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al actualizar verificación')
    }
  }

  async function handleTogglePremium(u: { id: string; username: string; is_premium: boolean }) {
    try {
      const res = await fetch('/api/admin/premium', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: u.id, is_premium: !u.is_premium })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error')
      loadUsers(page, search)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al actualizar premium')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-200">
        <main className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
          <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-200">
        <main className="mx-auto max-w-6xl px-4 py-24 text-center lg:px-6">
          <ShieldIcon className="mx-auto h-10 w-10 text-slate-600" />
          <h1 className="mt-4 text-xl font-bold text-white">Panel Admin</h1>
          <p className="mt-2 text-sm text-slate-400">{error || 'No hay datos disponibles'}</p>
          <Link
            href="/binder"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Volver a mi binder
          </Link>
        </main>
      </div>
    )
  }

  const { users, cards, binders, offers, marketValue, recent, activity } = data
  const q = search.trim()

  const safePage = Math.min(page, userPages)
  const from = userTotal === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, userTotal)

  const avgCardsPerUser = users.total > 0 ? Math.round(cards.total / users.total) : 0
  const publicBinderPct = binders.total > 0 ? Math.round((binders.public / binders.total) * 100) : 0
  const listings = cards.forSale + cards.forTrade
  const decided = offers.accepted + offers.rejected
  const acceptRate = decided > 0 ? Math.round((offers.accepted / decided) * 100) : 0

  const kpis = [
    {
      label: 'Usuarios',
      value: fmtNum(users.total),
      sub: `+${users.new14d} en 14 días · ${users.verified} verificados`,
      icon: <UserIcon className="h-5 w-5" />,
      color: 'text-violet-400',
      glow: 'shadow-violet-500/10',
      border: 'border-violet-500/20',
      bg: 'from-violet-500/15'
    },
    {
      label: 'Cartas',
      value: fmtNum(cards.total),
      sub: `~${avgCardsPerUser} por usuario`,
      icon: <CardsIcon className="h-5 w-5" />,
      color: 'text-[#00ffcc]',
      glow: 'shadow-[#00ffcc]/10',
      border: 'border-[#00ffcc]/20',
      bg: 'from-[#00ffcc]/15'
    },
    {
      label: 'Binders',
      value: fmtNum(binders.total),
      sub: `${binders.public} públicos (${publicBinderPct}%)`,
      icon: <FolderIcon className="h-5 w-5" />,
      color: 'text-sky-400',
      glow: 'shadow-sky-500/10',
      border: 'border-sky-500/20',
      bg: 'from-sky-500/15'
    },
    {
      label: 'Valor mercado',
      value: `$${fmtUsd(marketValue)}`,
      sub: `${fmtNum(listings)} listados`,
      icon: <WalletIcon className="h-5 w-5" />,
      color: 'text-yellow-400',
      glow: 'shadow-yellow-500/10',
      border: 'border-yellow-500/20',
      bg: 'from-yellow-500/15'
    }
  ]

  const segments = [
    { label: 'Colección', count: cards.collection, color: 'bg-slate-500' },
    { label: 'En venta', count: cards.forSale, color: 'bg-emerald-500' },
    { label: 'Para cambio', count: cards.forTrade, color: 'bg-sky-500' },
    { label: 'Reservadas', count: cards.reserved, color: 'bg-amber-500' }
  ]
  const segmentTotal = Math.max(1, segments.reduce((acc, s) => acc + s.count, 0))

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">

        {/* ─── Header: glass panel ─── */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                  <ShieldIcon className="h-5 w-5 text-violet-400" />
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">Panel Admin</h1>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Estadísticas de la comunidad · actualizado {formatDate(data.generatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/50 px-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
              >
                <RefreshIcon className="h-4 w-4" />
                Actualizar
              </button>
              <Link
                href="/binder"
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#00ffcc] px-3 text-sm font-bold text-[#080c15] shadow-[0_0_12px_rgba(0,255,204,0.25)] transition-all hover:brightness-110"
              >
                Mi binder
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── KPI cards ─── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className={`relative overflow-hidden rounded-2xl border ${k.border} bg-slate-900/60 p-4 backdrop-blur-xl transition-shadow hover:shadow-lg ${k.glow}`}
            >
              <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${k.bg} to-transparent blur-2xl`} />
              <div className="relative">
                <div className={`flex items-center gap-1.5 ${k.color}`}>
                  {k.icon}
                  <p className="text-[10px] font-semibold uppercase tracking-widest">{k.label}</p>
                </div>
                <p className={`mt-2 truncate text-2xl font-extrabold ${k.color}`}>{k.value}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Marketplace: glass panel ─── */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-1.5">
            <ChartIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white">Marketplace</h2>
          </div>

          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-800">
            {segments.map((s) =>
              s.count > 0 ? (
                <div
                  key={s.label}
                  className={s.color}
                  style={{ width: `${(s.count / segmentTotal) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              ) : null
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {segments.map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`h-2 w-2 rounded-full ${s.color}`} />
                <span className="font-semibold text-white">{fmtNum(s.count)}</span> {s.label}
              </span>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 flex items-center gap-1.5 text-slate-400">
                <SwapIcon className="h-4 w-4" />
                Ofertas:
              </span>
              <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {offers.total} total
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400">
                {offers.pending} pendientes
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                {offers.accepted} aceptadas
              </span>
              <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-400">
                {offers.rejected} rechazadas
              </span>
              <span className="rounded-full bg-slate-700/50 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {offers.cancelled} canceladas
              </span>
            </div>
            <p className="mt-2 text-right text-xs text-slate-500">
              Tasa de aceptación: <strong className="text-emerald-400">{acceptRate}%</strong>
            </p>
          </div>
        </section>

        {/* ─── Tabs ─── */}
        <div className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 backdrop-blur-xl">
          {([
            { key: 'users' as const, icon: '👥', label: 'Usuarios', count: users.total },
            { key: 'activity' as const, icon: '📈', label: 'Actividad', count: recent.length },
            { key: 'integrations' as const, icon: '🔌', label: 'Integraciones', count: null }
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[#00ffcc]/15 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.1)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {t.count != null && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  tab === t.key ? 'bg-[#00ffcc]/20 text-[#00ffcc]' : 'bg-white/10 text-slate-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── Usuarios ─── */}
        {tab === 'users' && (
          <section className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-bold text-white">Usuarios</h2>
                <span className="text-xs text-slate-500">
                  {usersLoading ? 'Buscando…' : `${fmtNum(userTotal)} de ${fmtNum(users.total)}`}
                </span>
              </div>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar por usuario o ubicación…"
                aria-label="Filtrar usuarios"
                className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-[#00ffcc]/50"
              />
            </div>

            {/* Desktop: tabla */}
            <div
              className={`hidden overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl transition-opacity md:block ${
                usersLoading ? 'opacity-50' : ''
              }`}
            >
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800/60 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3 text-center">Binders</th>
                    <th className="px-4 py-3 text-center">Cartas</th>
                    <th className="px-4 py-3 text-center">Venta</th>
                    <th className="px-4 py-3 text-center">Cambio</th>
                    <th className="px-4 py-3">Registro</th>
                    <th className="px-4 py-3">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {userRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        {q ? 'Sin coincidencias para tu búsqueda' : 'Sin usuarios todavía'}
                      </td>
                    </tr>
                  )}
                  {userRows.map((u) => {
                    const trainer = computeTrainerScore({
                      capturedSpecies: 0,
                      completedSales: u.saleCount,
                      completedTrades: u.tradeCount,
                      completedBuys: 0,
                      reviewCount: 0
                    })
                    return (
                      <tr key={u.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="relative shrink-0">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-rose-500/25 text-xs font-bold text-white">
                                {(u.username[0] ?? '?').toUpperCase()}
                              </div>
                              {u.is_verified && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00ffcc] text-[8px] font-bold text-[#080c15]">✓</span>
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/binder/${encodeURIComponent(u.username)}`}
                                className="font-semibold text-violet-400 hover:underline"
                              >
                                @{u.username}
                              </Link>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">
                                  {trainer.rank.icon} {trainer.rank.name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {formatLocation(u.city, u.country) || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-slate-300">
                            {u.binderCount > 0 && (u.hasPublicBinder ? (
                              <GlobeIcon className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <LockIcon className="h-3.5 w-3.5 text-slate-500" />
                            ))}
                            {u.binderCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-white">{u.cardCount}</td>
                        <td className="px-4 py-3 text-center text-emerald-400">{u.saleCount}</td>
                        <td className="px-4 py-3 text-center text-sky-400">{u.tradeCount}</td>
                        <td className="px-4 py-3 text-slate-400">{formatDate(u.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {u.is_admin ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                                <ShieldIcon className="h-3 w-3" /> ADMIN
                              </span>
                            ) : null}
                            <button
                              onClick={() => handleVerify(u)}
                              title={u.is_verified ? 'Quitar verificación' : 'Marcar como verificado'}
                              aria-label={`${u.is_verified ? 'Quitar' : 'Marcar'} verificación de @${u.username}`}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                                u.is_verified
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                  : 'border-slate-700 text-slate-600 hover:border-emerald-500/40 hover:text-emerald-400'
                              }`}
                            >
                              ⚡
                            </button>
                            <button
                              onClick={() => handleTogglePremium(u)}
                              title={u.is_premium ? 'Quitar premium' : 'Marcar como premium'}
                              aria-label={`${u.is_premium ? 'Quitar' : 'Marcar'} premium de @${u.username}`}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                                u.is_premium
                                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                                  : 'border-slate-700 text-slate-600 hover:border-amber-500/40 hover:text-amber-400'
                              }`}
                            >
                              ★
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className={`space-y-3 md:hidden ${usersLoading ? 'opacity-50' : ''}`}>
              {userRows.length === 0 && (
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center backdrop-blur-xl">
                  <p className="text-sm text-slate-500">{q ? 'Sin coincidencias' : 'Sin usuarios todavía'}</p>
                </div>
              )}
              {userRows.map((u) => {
                const trainer = computeTrainerScore({
                  capturedSpecies: 0,
                  completedSales: u.saleCount,
                  completedTrades: u.tradeCount,
                  completedBuys: 0,
                  reviewCount: 0
                })
                return (
                  <div key={u.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-rose-500/25 text-sm font-bold text-white">
                            {(u.username[0] ?? '?').toUpperCase()}
                          </div>
                          {u.is_verified && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#00ffcc] text-[8px] font-bold text-[#080c15]">✓</span>
                          )}
                        </div>
                        <div>
                          <Link href={`/binder/${encodeURIComponent(u.username)}`} className="font-semibold text-violet-400 hover:underline">
                            @{u.username}
                          </Link>
                          <p className="text-[11px] text-slate-500">
                            {trainer.rank.icon} {trainer.rank.name} · {formatLocation(u.city, u.country) || 'Sin ubicación'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {u.is_admin && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                            <ShieldIcon className="h-3 w-3" /> ADMIN
                          </span>
                        )}
                        <button
                          onClick={() => handleVerify(u)}
                          title={u.is_verified ? 'Quitar verificación' : 'Marcar como verificado'}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                            u.is_verified
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                              : 'border-slate-700 text-slate-600 hover:border-emerald-500/40 hover:text-emerald-400'
                          }`}
                        >
                          ⚡
                        </button>
                        <button
                          onClick={() => handleTogglePremium(u)}
                          title={u.is_premium ? 'Quitar premium' : 'Marcar como premium'}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${
                            u.is_premium
                              ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                              : 'border-slate-700 text-slate-600 hover:border-amber-500/40 hover:text-amber-400'
                          }`}
                        >
                          ★
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl bg-slate-800/50 px-2 py-1.5">
                        <p className="text-xs font-bold text-white">{u.binderCount}</p>
                        <p className="text-[10px] text-slate-500">Binders</p>
                      </div>
                      <div className="rounded-xl bg-slate-800/50 px-2 py-1.5">
                        <p className="text-xs font-bold text-white">{u.cardCount}</p>
                        <p className="text-[10px] text-slate-500">Cartas</p>
                      </div>
                      <div className="rounded-xl bg-emerald-500/10 px-2 py-1.5">
                        <p className="text-xs font-bold text-emerald-400">{u.saleCount}</p>
                        <p className="text-[10px] text-slate-500">Venta</p>
                      </div>
                      <div className="rounded-xl bg-sky-500/10 px-2 py-1.5">
                        <p className="text-xs font-bold text-sky-400">{u.tradeCount}</p>
                        <p className="text-[10px] text-slate-500">Cambio</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-600">Registro: {formatDate(u.created_at)}</p>
                  </div>
                )
              })}
            </div>

            {/* Paginación */}
            {userTotal > PAGE_SIZE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-xs text-slate-500">
                  Mostrando <strong className="text-slate-300">{from}–{to}</strong> de <strong className="text-slate-300">{fmtNum(userTotal)}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="flex h-8 items-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
                  >
                    ←
                  </button>
                  {pageList(safePage, userPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="px-1 text-xs text-slate-600">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === safePage ? 'page' : undefined}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                          p === safePage
                            ? 'bg-[#00ffcc]/15 text-[#00ffcc]'
                            : 'border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(userPages, p + 1))}
                    disabled={safePage === userPages}
                    className="flex h-8 items-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── Actividad reciente ─── */}
        {tab === 'activity' && (
          <section className="mt-5 space-y-5">
            <AdminActivityChart data={activity} />

            <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl">
              <div className="flex items-center gap-1.5 border-b border-slate-800/60 px-5 py-3">
                <ActivityIcon className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-bold text-white">Actividad reciente</h2>
              </div>

              {/* Desktop: tabla */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800/60 text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Carta</th>
                      <th className="px-5 py-3">Set</th>
                      <th className="px-5 py-3">Estado</th>
                      <th className="px-5 py-3 text-right">Precio</th>
                      <th className="px-5 py-3">Dueño</th>
                      <th className="px-5 py-3">Actualización</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recent.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Sin actividad todavía</td>
                      </tr>
                    )}
                    {recent.map((c, i) => (
                      <tr key={i} className="transition-colors hover:bg-white/[0.02]">
                        <td className="px-5 py-3 font-semibold text-white">{c.card_name}</td>
                        <td className="px-5 py-3 text-slate-400">{c.set_id} · {c.number}</td>
                        <td className="px-5 py-3">{statusBadge(c.status)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-400">
                          {c.price != null ? `$${fmtUsd(c.price)}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-slate-400">@{c.username}</td>
                        <td className="px-5 py-3 text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {formatDate(c.updated_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="divide-y divide-slate-800/60 md:hidden">
                {recent.length === 0 && (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">Sin actividad todavía</p>
                )}
                {recent.map((c, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{c.card_name}</p>
                        <p className="text-[11px] text-slate-500">{c.set_id} · {c.number}</p>
                      </div>
                      {statusBadge(c.status)}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">@{c.username}</span>
                      <span className="font-semibold text-emerald-400">
                        {c.price != null ? `$${fmtUsd(c.price)}` : '—'}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-600">
                      <ClockIcon className="mr-1 inline h-3 w-3" />
                      {formatDate(c.updated_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── Integraciones ─── */}
        {tab === 'integrations' && (
          <section className="mt-5">
            <AdminIntegrations />
          </section>
        )}
      </main>
    </div>
  )
}
