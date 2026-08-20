import { NextResponse } from 'next/server'

// Proxy de imágenes de cartas: resuelve la URL real de la imagen y la sirve
// con headers CORS, para que el canvas pueda exportarla sin tainted.
// Parámetros: ?src=<encoded-url>
export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = [
  'images.pokemontcg.io',
  'images.scrydex.com',
  'api.tcgdex.net'
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const src = searchParams.get('src')

  if (!src) {
    return NextResponse.json({ error: 'Missing src param' }, { status: 400 })
  }

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!ALLOWED_HOSTS.includes(url.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TCGClaim/1.0' }
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: res.status })
    }

    const contentType = res.headers.get('content-type') ?? 'image/png'
    const body = await res.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
      }
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 })
  }
}
