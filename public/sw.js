/**
 * TCG Claim — Service Worker
 *
 * Estrategia de cache (conservadora):
 *   - PRECACHE (install): app-shell offline, íconos y manifest web.
 *   - `/_next/static/*`  : cache-first con actualización en background (SWR).
 *   - Navegaciones        : network-first, cae a /offline si no hay red.
 *   - API / Supabase      : network-only.
 *   - IMÁGENES (CDNs)     : network-only. NO se interceptan: el cache de
 *                           respuestas opacas (sin CORS) podía servir imágenes
 *                           rotas. Las cartas cargan directo del CDN.
 */

const VERSION = 'v03ca06f'
const STATIC_CACHE = `tcg-claim-shell-${VERSION}`
const RUNTIME_CACHE = `tcg-claim-runtime-${VERSION}`

const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
]

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) {
    fetch(request)
      .then((res) => {
        if (res.ok) {
          caches.open(cacheName).then(async (cache) => {
            try {
              await cache.put(request, res)
            } catch {
              /* la escritura al cache no debe romper nada */
            }
          })
        }
      })
      .catch(() => {})
    return cached
  }

  try {
    const res = await fetch(request)
    if (res.ok) {
      try {
        const cache = await caches.open(cacheName)
        await cache.put(request, res.clone())
      } catch {
        /* el fallo de cache no corta la respuesta */
      }
    }
    return res
  } catch (err) {
    const fallback = await caches.match(request)
    if (fallback) return fallback
    throw err
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Solo cachear requests http/https (evita esquemas raros como chrome-extension).
  if (!/^https?:$/.test(url.protocol)) return

  // Navegaciones: network-first con fallback a la página offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put('/offline-shell', copy)).catch(() => {})
          return res
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match('/offline').then((offline) => offline || caches.match('/offline-shell'))
          )
        )
    )
    return
  }

  // Assets de la build de Next: filenames con hash → cache-first.
  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE))
    return
  }

  // Todo lo demás (imágenes CDN, API, Supabase, HTML dinámico): network-only.
})