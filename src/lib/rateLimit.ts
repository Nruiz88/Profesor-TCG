/**
 * Rate limiter in-memory con sliding window.
 *
 * Funciona por instancia serverless (se resetea en cold starts).
 * Para producción con múltiples instancias, migrar a @upstash/ratelimit
 * con Upstash Redis (1 línea de cambio).
 *
 * Uso en API route:
 *   const rl = rateLimit(req, { windowMs: 60_000, max: 30 })
 *   if (rl.limited) return rl.response
 */

import { NextResponse } from 'next/server'

interface RateLimitConfig {
  /** Ventana de tiempo en ms (default: 60 segundos) */
  windowMs: number
  /** Máximo de requests por ventana (default: 30) */
  max: number
}

interface RateLimitResult {
  limited: boolean
  response?: NextResponse
  remaining: number
  resetMs: number
}

// Store en memoria por instancia
const store = new Map<string, { count: number; resetAt: number }>()

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store) {
    if (val.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

function getClientIp(req: Request): string {
  // En Vercel, x-forwarded-for tiene la IP real
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export function rateLimit(
  req: Request,
  config: RateLimitConfig = { windowMs: 60_000, max: 30 }
): RateLimitResult {
  const ip = getClientIp(req)
  const pathname = new URL(req.url).pathname
  const key = `${ip}:${pathname}`
  const now = Date.now()
  const resetAt = now + config.windowMs

  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // Nueva ventana
    store.set(key, { count: 1, resetAt })
    return { limited: false, remaining: config.max - 1, resetMs: resetAt }
  }

  entry.count++

  if (entry.count > config.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      limited: true,
      response: NextResponse.json(
        {
          error: 'Demasiadas peticiones',
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(config.max),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000))
          }
        }
      ),
      remaining: 0,
      resetMs: entry.resetAt
    }
  }

  return {
    limited: false,
    remaining: config.max - entry.count,
    resetMs: entry.resetAt
  }
}

// ── Configuraciones predefinidas ────────────────────────────────────

/** Búsqueda: 30 requests/min por IP */
export const searchLimit = (req: Request) =>
  rateLimit(req, { windowMs: 60_000, max: 30 })

/** APIs generales: 60 requests/min por IP */
export const apiLimit = (req: Request) =>
  rateLimit(req, { windowMs: 60_000, max: 60 })

/** Escritura (POST/PUT/DELETE): 20 requests/min por IP */
export const writeLimit = (req: Request) =>
  rateLimit(req, { windowMs: 60_000, max: 20 })

/** Explorar/Profile (lectura pesada): 15 requests/min por IP */
export const heavyReadLimit = (req: Request) =>
  rateLimit(req, { windowMs: 60_000, max: 15 })
