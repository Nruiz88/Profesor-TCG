const POKEWALLET_BASE = 'https://api.pokewallet.io'

export default async function handler(req, res) {
  const apiKey = process.env.POKEWALLET_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'POKEWALLET_API_KEY no configurada en las variables de entorno de Vercel' })
  }

  try {
    const upstream = await fetch(`${POKEWALLET_BASE}/sets`, {
      headers: { 'X-API-Key': apiKey }
    })

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Error en la API de PokéWallet', status: upstream.status })
    }

    const data = await upstream.json()
    const sets = (data.data || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).json({ data: sets, total: data.total })
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo conectar con PokéWallet', detail: err.message })
  }
}