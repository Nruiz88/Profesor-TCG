/**
 * TCG Claim — Service Worker
 *
 * Estrategia de cache:
 *   - PRECACHE (install): app-shell offline, íconos y manifest web.
 *   - `/_next/static/*`  : cache-first con actualización en background (SWR).
 *   - Imágenes CDN        : SWR con tope de entradas. Se cachean también
 *                           respuestas OPACAS (CDNs sin CORS como
 *                           images.pokemontcg.io) para poder ver offline las
 *                           cartas ya visitadas. El fetch es tolerante a
 *                           errores: un fallo transitorio de red no rompe la
 *                           imagen online (vuelve a resolver por cache o cae
 *                           al onError del <img>).
 *   - Navegaciones        : network-first, cae a /offline si no hay red.
 *   - API/Supabase/auth   : network-only (no se cachea data dinámica).
 */

const VERSION = 'vee05ae5'
const STATIC_CACHE = `tcg-claim-shell-${VERSION}`
const RUNTIME_CACHE = `tcg-claim-runtime-${VERSION}`
const IMAGE_CACHE = `tcg-claim-images-${VERSION}`
const IMAGE_MAX = 400

const PRECACHE_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
]

const IMAGE_HOSTS = [
  'images.pokemontcg.io',
  'images.scrydex.com',
  'assets.tcgdex.net',
  'raw.githubusercontent.com'
]

function isImageRequest(url) {
  return IMAGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith('.' + host))
}

function isSupabaseStorage(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public')
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    await Promise.all(toDelete.map((k) => cache.delete(k)))
  }
}

/**
 * Cache-first con actualización en background (SWR).
 * - allowOpaque: permite cachear respuestas opacas (sin CORS) para imágenes.
 * - Si fetch falla y hay cache, sirve el cache sin romper la request.
 */
async function cacheFirst(request, cacheName, { allowOpaque = false, maxEntries } = {}) {
  const cached = await caches.match(request)
  if (cached) {
    fetch(request)
      .then((res) => {
        if (res.ok || (allowOpaque && res.type === 'opaque')) {
          caches.open(cacheName).then((cache) => {
            cache.put(request, res)
            if (maxEntries) trimCache(cacheName, maxEntries)
          })
        }
      })
      .catch(() => {})
    return cached
  }

  try {
    const res = await fetch(request)
    if (res.ok || (allowOpaque && res.type === 'opaque')) {
      const cache = await caches.open(cacheName)
      cache.put(request, res.clone())
      if (maxEntries) trimCache(cacheName, maxEntries)
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
            .filter(
              (k) =>
                k !== STATIC_CACHE && k !== RUNTIME_CACHE && k !== IMAGE_CACHE
            )
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

  // Imágenes de cartas (CDNs) y avatares/upload de Supabase: SWR con tope.
  if (isImageRequest(url) || isSupabaseStorage(url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, { allowOpaque: true, maxEntries: IMAGE_MAX }))
    return
  }

  // Todo lo demás (API, Supabase realtime, auth, HTML dinámico): network-only.
})