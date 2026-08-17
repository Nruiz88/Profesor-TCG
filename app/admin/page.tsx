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
  TagIcon,
  UserIcon,
  WalletIcon
} from '@/components/icons'
import { formatLocation } from '@/lib/profile'
import AdminIntegrations from '@/components/AdminIntegrations'

interface Overview {
  generatedAt: string
  users: {
    total: number
    rows: Array<{
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
    }>
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
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Error al actualizar verificación')
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded-lg bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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

  const { users, cards, binders, offers, marketValue, recent } = data

  const kpis = [
    {
      label: 'Usuarios',
      value: String(users.total),
      icon: <UserIcon className="h-4 w-4 text-violet-400" />,
      tint: 'text-violet-400'
    },
    {
      label: 'Cartas registradas',
      value: String(cards.total),
      icon: <CardsIcon className="h-4 w-4 text-white" />,
      tint: 'text-white'
    },
    {
      label: 'Binders',
      value: `${binders.total} (${binders.public} pub.)`,
      icon: <FolderIcon className="h-4 w-4 text-sky-400" />,
      tint: 'text-sky-400'
    },
    {
      label: 'En venta',
      value: String(cards.forSale),
      icon: <TagIcon className="h-4 w-4 text-emerald-400" />,
      tint: 'text-emerald-400'
    },
    {
      label: 'Para cambio',
      value: String(cards.forTrade),
      icon: <SwapIcon className="h-4 w-4 text-sky-400" />,
      tint: 'text-sky-400'
    },
    {
      label: 'Reservadas',
      value: String(cards.reserved),
      icon: <LockIcon className="h-4 w-4 text-amber-400" />,
      tint: 'text-amber-400'
    },
    {
      label: 'Valor de mercado',
      value: `$${fmtUsd(marketValue)}`,
      icon: <WalletIcon className="h-4 w-4 text-yellow-400" />,
      tint: 'text-yellow-400'
    },
    {
      label: 'Ofertas pendientes',
      value: String(offers.pending),
      icon: <SwapIcon className="h-4 w-4 text-rose-400" />,
      tint: 'text-rose-400'
    }
  ]

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

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex items-center gap-1.5">
              {k.icon}
              <p className="text-[10px] uppercase tracking-widest text-slate-500">{k.label}</p>
            </div>
            <p className={`mt-1 truncate text-xl font-bold ${k.tint}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Ofertas */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
        <span className="mr-1 flex items-center gap-1.5 text-slate-400">
          <ChartIcon className="h-4 w-4" />
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
      </div>

      {/* Tabla de usuarios */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Usuarios</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-500">
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
              {users.rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Sin usuarios todavía
                  </td>
                </tr>
              )}
              {users.rows.map((u) => (
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
      </section>

      {/* Integraciones y API keys */}
      <AdminIntegrations />

      {/* Actividad reciente */}
      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Actividad reciente</h2>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-900/80 text-[10px] uppercase tracking-widest text-slate-500">
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
      </section>
    </main>
  )
}
