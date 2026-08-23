'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Registra el service worker (public/sw.js) en producción y gestiona el
 * flujo de actualización con banner:
 *
 * - El SW nuevo NO toma el control automático (queda "waiting").
 * - Cuando se detecta una actualización, se muestra un banner
 *   "Nueva versión disponible" con botón Actualizar.
 * - Al confirmar, se le envía SKIP_WAITING al SW nuevo → activa → se recarga.
 *
 * Sin banner no se recarga sola: evitamos interrumpir al usuario.
 */
export default function SWRegister() {
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const applyRef = useRef<() => void>(() => {})
  const applyingRef = useRef(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let reg: ServiceWorkerRegistration | null = null

    const onControllerChange = () => {
      // Solo recarga cuando fue el usuario quien confirmó la actualización.
      if (applyingRef.current) window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const trackInstalling = () => {
      const installing = reg?.installing
      if (!installing) return
      installing.addEventListener('statechange', () => {
        // 'installed' + ya hay un SW controlando → hay actualización pendiente.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          setUpdateReady(true)
        }
      })
    }

    const check = () => reg?.update().catch(() => {})
    const onVisible = () => {
      if (!document.hidden) check()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = setInterval(check, 60 * 60 * 1000)

    const register = async () => {
      try {
        reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        })
        reg.addEventListener('updatefound', trackInstalling)
        trackInstalling()
        applyRef.current = () => {
          applyingRef.current = true
          if (reg?.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          } else {
            window.location.reload()
          }
        }
        check()
      } catch {
        /* Sin SW: la app funciona online normal. */
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      window.removeEventListener('load', register)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(interval)
    }
  }, [])

  if (!updateReady || dismissed) return null

  return (
    <div className="fixed inset-x-3 top-3 z-[60] flex justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Nueva versión disponible</p>
          <p className="truncate text-xs text-slate-400">Actualizá para ver los últimos cambios.</p>
        </div>
        <button
          type="button"
          onClick={() => applyRef.current()}
          className="shrink-0 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-400"
        >
          Actualizar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso de actualización"
          className="shrink-0 text-slate-400 transition-colors hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}