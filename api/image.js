const POKEWALLET_BASE = 'https://api.pokewallet.io'

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
  const apiKey = process.env.POKEWALLET_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'POKEWALLET_API_KEY no configurada en las variables de entorno de Vercel' })
  }

  const id = searchParams.get('id')
  if (!id) {
    return res.status(400).json({ error: 'Parámetro "id" es requerido' })
  }

  const size = searchParams.get('size') === 'high' ? 'high' : 'low'
  const lang = searchParams.get('lang')
  const upstreamUrl = `${POKEWALLET_BASE}/images/${encodeURIComponent(id)}?size=${size}${lang ? `&lang=${lang}` : ''}`

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'X-API-Key': apiKey }
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'No se pudo obtener la imagen' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    return res.status(200).send(buffer)
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo conectar con PokéWallet', detail: err.message })
  }
}