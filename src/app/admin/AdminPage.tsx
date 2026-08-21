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

interface UserRow {
  id: string
  username: string
  city: string | null
  country: string | null
  created_at: string
  is_admin: boolean
  is_verified: boolean
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

// Lista de números de página visibles, con elipsis para listados largos.
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

  useEffect(() => {
    load()
  }, [load])

  // Paginado y búsqueda server-side de la tabla de usuarios
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

  // Al cambiar la búsqueda vuelve a la primera página
  useEffect(() => {
    setPage(1)
  }, [search])

  // Debounce para no disparar una request por tecla; refetchea al recargar KPIs
  useEffect(() => {
    const t = setTimeout(() => loadUsers(page, search), 250)
    return () => clearTimeout(t)
  }, [page, search, data, loadUsers])

  // Marca/desmarca el badge ⚡ VERIFICADO de un usuario
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

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900" />
          ))}
        </div>
      </main>
    )
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-24 text-center">
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
    )
  }

  const { users, cards, binders, offers, marketValue, recent, activity } = data
  const q = search.trim()

  // Paginación de la tabla de usuarios (la página llega clamped al servidor)
  const safePage = Math.min(page, userPages)
  const from = userTotal === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, userTotal)

  // Sub-métricas derivadas del overview (conteos exactos del servidor)
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
      icon: <UserIcon className="h-4 w-4 text-violet-400" />,
      tint: 'text-violet-400'
    },
    {
      label: 'Cartas registradas',
      value: fmtNum(cards.total),
      sub: `~${avgCardsPerUser} por usuario`,
      icon: <CardsIcon className="h-4 w-4 text-white" />,
      tint: 'text-white'
    },
    {
      label: 'Binders',
      value: fmtNum(binders.total),
      sub: `${binders.public} públicos (${publicBinderPct}%)`,
      icon: <FolderIcon className="h-4 w-4 text-sky-400" />,
      tint: 'text-sky-400'
    },
    {
      label: 'Valor de mercado',
      value: `$${fmtUsd(marketValue)}`,
      sub: `${fmtNum(listings)} listados en oferta`,
      icon: <WalletIcon className="h-4 w-4 text-yellow-400" />,
      tint: 'text-yellow-400'
    }
  ]

  // Distribución de cartas por estado para la barra del marketplace
  const segments = [
    { label: 'Colección', count: cards.collection, color: 'bg-slate-500' },
    { label: 'En venta', count: cards.forSale, color: 'bg-emerald-500' },
    { label: 'Para cambio', count: cards.forTrade, color: 'bg-sky-500' },
    { label: 'Reservadas', count: cards.reserved, color: 'bg-amber-500' }
  ]
  const segmentTotal = Math.max(1, segments.reduce((acc, s) => acc + s.count, 0))

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldIcon className="h-6 w-6 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">Panel Admin</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Estadísticas de la comunidad · actualizado {formatDate(data.generatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshIcon className="h-4 w-4" />
            Actualizar
          </button>
          <Link
            href="/binder"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Mi binder
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPIs principales con sub-métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-1.5">
              {k.icon}
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{k.label}</p>
            </div>
            <p className={`mt-1 truncate text-2xl font-bold ${k.tint}`}>{k.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Marketplace: distribución de cartas + ofertas en una sola sección */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
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

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3 text-sm">
          <span className="mr-1 flex items-center gap-1.5 text-slate-400">
            <SwapIcon className="h-4 w-4" />
            Ofertas de intercambio:
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 font-semibold text-slate-200">
            {offers.total} total
          </span>
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-semibold text-amber-400">
            {offers.pending} pendientes
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-400">
            {offers.accepted} aceptadas
          </span>
          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 font-semibold text-rose-400">
            {offers.rejected} rechazadas
          </span>
          <span className="rounded-full bg-slate-700/50 px-2.5 py-1 font-semibold text-slate-300">
            {offers.cancelled} canceladas
          </span>
          <span className="ml-auto text-xs text-slate-500">
            Tasa de aceptación: <strong className="text-emerald-400">{acceptRate}%</strong>
          </span>
        </div>
      </section>

      {/* Tabs: redistribuyen el contenido para que el panel no sea eterno */}
      <div className="mt-8 flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        <button
          type="button"
          onClick={() => setTab('users')}
          aria-pressed={tab === 'users'}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'users'
              ? 'bg-binder-accent text-white shadow'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          👥 Usuarios
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              tab === 'users' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
            }`}
          >
            {users.total}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('activity')}
          aria-pressed={tab === 'activity'}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'activity'
              ? 'bg-binder-accent text-white shadow'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          📈 Actividad reciente
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
              tab === 'activity' ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
            }`}
          >
            {recent.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('integrations')}
          aria-pressed={tab === 'integrations'}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'integrations'
              ? 'bg-binder-accent text-white shadow'
              : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          🔌 Integraciones
        </button>
      </div>

      {/* Usuarios: búsqueda y paginación server-side */}
      {tab === 'users' && (
        <section className="mt-6">
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
              className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-binder-accent"
            />
          </div>

          <div
            className={`overflow-hidden rounded-xl border border-slate-800 transition-opacity ${
              usersLoading ? 'opacity-50' : ''
            }`}
          >
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500">
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
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {userRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      {q ? 'Sin coincidencias para tu búsqueda' : 'Sin usuarios todavía'}
                    </td>
                  </tr>
                )}
                {userRows.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/binder/${encodeURIComponent(u.username)}`}
                        className="font-semibold text-violet-400 hover:underline"
                      >
                        @{u.username}
                      </Link>
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
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controles de paginación */}
          {userTotal > PAGE_SIZE && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-xs text-slate-500">
                Mostrando{' '}
                <strong className="text-slate-300">
                  {from}–{to}
                </strong>{' '}
                de <strong className="text-slate-300">{fmtNum(userTotal)}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Página anterior"
                  className="flex h-8 items-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
                >
                  ←
                </button>
                {pageList(safePage, userPages).map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="px-1 text-xs text-slate-600">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === safePage ? 'page' : undefined}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
                        p === safePage
                          ? 'bg-binder-accent text-white shadow'
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
                  aria-label="Página siguiente"
                  className="flex h-8 items-center rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Actividad reciente: gráfico + tabla */}
      {tab === 'activity' && (
        <section className="mt-6 space-y-6">
          <AdminActivityChart data={activity} />

          <div>
          <div className="mb-3 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-slate-400" />
            <h2 className="text-lg font-bold text-white">Actividad reciente</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Carta</th>
                  <th className="px-4 py-3">Set</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3">Dueño</th>
                  <th className="px-4 py-3">Última actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Sin actividad todavía
                    </td>
                  </tr>
                )}
                {recent.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-white">{c.card_name}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.set_id} · {c.number}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                      {c.price != null ? `$${fmtUsd(c.price)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">@{c.username}</td>
                    <td className="px-4 py-3 text-slate-500">
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
          </div>
        </section>
      )}

      {/* Integraciones y API keys */}
      {tab === 'integrations' && (
        <section className="mt-6">
          <AdminIntegrations />
        </section>
      )}
    </main>
  )
}