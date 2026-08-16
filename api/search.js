const POKEWALLET_BASE = 'https://api.pokewallet.io'

export default async function handler(req, res) {
  const { path = '', searchParams } = new URL(req.url, `http://${req.headers.host}`)
  const apiKey = process.env.POKEWALLET_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'POKEWALLET_API_KEY no configurada en las variables de entorno de Vercel' })
  }

  const q = searchParams.get('q')
  if (!q) {
    return res.status(400).json({ error: 'Parámetro "q" es requerido' })
  }

  const upstreamUrl = `${POKEWALLET_BASE}/search?q=${encodeURIComponent(q)}&limit=${searchParams.get('limit') || 10}`

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'X-API-Key': apiKey }
    })

    const rateLimitHour = upstream.headers.get('X-RateLimit-Remaining-Hour') || null

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'Error en la API de PokéWallet',
        status: upstream.status,
        rateLimitRemainingHour: rateLimitHour
      })
    }

    const data = await upstream.json()
    return res.status(200).json({ ...data, rateLimitRemainingHour: rateLimitHour })
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo conectar con PokéWallet', detail: err.message })
  }
}