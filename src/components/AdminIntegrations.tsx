'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ApiKeyStatus } from '@/lib/apiKeys'
import {
  AlertIcon,
  CheckIcon,
  KeyIcon,
  RefreshIcon,
  TrashIcon
} from '@/components/icons'

interface Feedback {
  name: string
  kind: 'ok' | 'error'
  msg: string
}

// Sección "Integraciones" del panel admin: gestión segura de API keys.
// Las claves se guardan solo en el servidor (env var o app_settings con
// acceso exclusivo service role) y acá solo se muestran enmascaradas.
export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<ApiKeyStatus[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const body = await res.json()
      if (res.ok && body.integrations) setIntegrations(body.integrations)
    } catch {
      // se reporta en feedback
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function post(body: Record<string, string>) {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error de la API')
    return data
  }

  async function handleSave(name: string, label: string) {
    const value = (values[name] ?? '').trim()
    if (!value) {
      setFeedback({ name, kind: 'error', msg: 'Ingresá la clave para guardarla.' })
      return
    }
    setBusy((b) => ({ ...b, [name]: true }))
    setFeedback(null)
    try {
      await post({ action: 'set', name, value })
      setValues((v) => ({ ...v, [name]: '' }))
      await load()
      setFeedback({ name, kind: 'ok', msg: `Clave de ${label} guardada en el servidor.` })
    } catch (err) {
      setFeedback({
        name,
        kind: 'error',
        msg: err instanceof Error ? err.message : 'Error al guardar'
      })
    } finally {
      setBusy((b) => ({ ...b, [name]: false }))
    }
  }

  async function handleTest(name: string) {
    setTesting((t) => ({ ...t, [name]: true }))
    setFeedback(null)
    try {
      const data = await post({ action: 'test', name })
      const budgetLabel = name === 'poketrace_key' ? 'día' : 'hora'
      const budgetNote =
        data.budget && typeof data.budget.remaining === 'number'
          ? ` · Presupuesto del ${budgetLabel}: ${data.budget.used}/${data.budget.limit} pedidos (quedan ${data.budget.remaining})`
          : ''
      setFeedback({
        name,
        kind: data.ok ? 'ok' : 'error',
        msg: `${data.detail ?? (data.ok ? 'Conexión OK' : 'Error de conexión')}${budgetNote}`
      })
    } catch (err) {
      setFeedback({
        name,
        kind: 'error',
        msg: err instanceof Error ? err.message : 'Error al probar'
      })
    } finally {
      setTesting((t) => ({ ...t, [name]: false }))
    }
  }

  async function handleDelete(name: string, label: string) {
    if (!window.confirm(`¿Eliminar la clave de ${label}?`)) return
    setBusy((b) => ({ ...b, [name]: true }))
    setFeedback(null)
    try {
      await post({ action: 'delete', name })
      await load()
      setFeedback({ name, kind: 'ok', msg: `Clave de ${label} eliminada.` })
    } catch (err) {
      setFeedback({
        name,
        kind: 'error',
        msg: err instanceof Error ? err.message : 'Error al eliminar'
      })
    } finally {
      setBusy((b) => ({ ...b, [name]: false }))
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
          <KeyIcon className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Integraciones y API keys</h2>
          <p className="text-[10px] text-slate-500">Credenciales guardadas exclusivamente en el servidor</p>
        </div>
      </div>

      <div className="relative grid gap-3 md:grid-cols-2">
        {integrations.map((it) => {
          const isEnv = it.source === 'env'
          return (
            <div
              key={it.name}
              className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">{it.label}</p>
                {it.hasValue ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      isEnv
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    <CheckIcon className="h-3 w-3" />
                    {isEnv ? 'Env var' : 'Configurada'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    Sin configurar
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500">{it.hint}</p>

              {it.hasValue && (
                <p className="mt-2 font-mono text-xs text-slate-400">
                  {it.preview}
                  {isEnv && <span className="ml-2 text-slate-600">(definida por entorno)</span>}
                </p>
              )}

              {it.usage && (
                <div className="mt-3 rounded-xl border border-slate-800/40 bg-slate-900/50 px-3 py-2.5">
                  <p className="mb-1.5 text-[11px] text-slate-500">Consultas de valor de carta</p>
                  {[it.usage.hour, it.usage.day]
                    .filter((w): w is NonNullable<typeof it.usage.hour> => w != null)
                    .map((w) => (
                      <div key={w.period} className="mt-2 first:mt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            Este {w.label}:{' '}
                            <span className="font-semibold text-white">{w.used}</span>
                            {' / '}
                            {w.limit}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              w.remaining === 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            quedan {w.remaining}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              w.used >= w.limit
                                ? 'bg-rose-500'
                                : w.used / w.limit > 0.8
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (w.used / w.limit) * 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  type="password"
                  value={values[it.name] ?? ''}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [it.name]: e.target.value }))
                  }
                  disabled={isEnv}
                  placeholder={
                    isEnv
                      ? `Definida por env var (${it.label})`
                      : it.hasValue
                        ? 'Pegá una nueva clave para reemplazarla'
                        : 'Pegá la API key acá'
                  }
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-[#00ffcc]/50 focus:outline-none disabled:opacity-40"
                />
                <button
                  onClick={() => handleSave(it.name, it.label)}
                  disabled={isEnv || busy[it.name]}
                  className="rounded-xl bg-[#00ffcc]/15 px-3 py-2 text-sm font-semibold text-[#00ffcc] transition-colors hover:bg-[#00ffcc]/25 disabled:opacity-50"
                >
                  {busy[it.name] ? 'Guardando…' : 'Guardar'}
                </button>
                <button
                  onClick={() => handleTest(it.name)}
                  disabled={!it.hasValue || testing[it.name]}
                  className="rounded-xl bg-violet-500/15 px-3 py-2 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {testing[it.name] ? 'Probando…' : 'Probar conexión'}
                </button>
                {it.hasValue && !isEnv && (
                  <button
                    onClick={() => handleDelete(it.name, it.label)}
                    disabled={busy[it.name]}
                    aria-label={`Eliminar clave de ${it.label}`}
                    className="flex items-center rounded-xl bg-slate-800/60 px-2.5 py-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {it.docsUrl && (
                <a
                  href={it.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[11px] text-sky-400 hover:underline"
                >
                  Documentación de la API ↗
                </a>
              )}
            </div>
          )
        })}
      </div>

      {feedback && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {feedback.kind === 'ok' ? (
            <CheckIcon className="h-4 w-4 shrink-0" />
          ) : (
            <AlertIcon className="h-4 w-4 shrink-0" />
          )}
          {feedback.msg}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-slate-600">
        Las claves se guardan <strong className="text-slate-500">solo en el servidor</strong>{' '}
        (tabla sin acceso desde el navegador, escritura exclusiva de administradores) y nunca se
        muestran completas. En producción podés usar las variables de entorno{' '}
        <code className="rounded bg-slate-800/60 px-1.5 py-0.5 text-slate-400">POKEWALLET_API_KEY</code>,{' '}
        <code className="rounded bg-slate-800/60 px-1.5 py-0.5 text-slate-400">TCGAPI_KEY</code>{' '}y{' '}
        <code className="rounded bg-slate-800/60 px-1.5 py-0.5 text-slate-400">POKETRACE_API_KEY</code>{' '}
        que tienen prioridad sobre la base de datos.
      </p>
    </section>
  )
}
