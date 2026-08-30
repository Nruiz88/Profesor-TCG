import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Tasas de cambio de referencia contra USD (exchangerate-api via open.er-api,
// sin API key, cubre USD/EUR/ARS/MXN/CLP). Se cachean en memoria ~6h.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

let cache: { at: number; rates: Record<string, number> } | null = null

async function fetchRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data?.result !== 'success' || !data.rates) return null
    return { USD: 1, ...(data.rates as Record<string, number>) }
  } catch {
    return null
  }
}

export async function GET() {
  const now = Date.now()
  if (!cache || now - cache.at > CACHE_TTL_MS) {
    const rates = await fetchRates()
    if (!rates) {
      return NextResponse.json({ error: 'No se pudieron obtener las tasas' }, { status: 502 })
    }
    cache = { at: now, rates }
  }

  return NextResponse.json(
    { base: 'USD', rates: cache.rates, updatedAt: new Date(cache.at).toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600'
      }
    }
  )
}