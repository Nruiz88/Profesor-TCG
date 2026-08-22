'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (public/sw.js) en producción.
 * En desarrollo el SW cachearía assets sin hash y rompería el HMR,
 * así que se omite salvo en producción.
 *
 * - updateViaCache: 'none' fuerza al navegador a buscar el sw.js nuevo en cada
 *   navegación (el versionado en el build genera un archivo distinto por deploy).
 * - controllerchange: recarga la pestaña cuando el SW nuevo toma el control,
 *   aplicando la versión más reciente sin esperar al próximo refresh.
 */
export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none'
        })

        if (reg.active && !navigator.serviceWorker.controller) {
          reg.update().catch(() => {})
        }

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })
      } catch {
        /* Sin SW: la app sigue funcionando online. */
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}