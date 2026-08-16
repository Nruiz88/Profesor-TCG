const POKEWALLET_BASE = 'https://api.pokewallet.io'

export default async function handler(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`)
  const apiKey = process.env.POKEWALLET_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'POKEWALLET_API_KEY no configurada en las variables de entorno de Vercel' })
  }

  const setCode = searchParams.get('set')
  if (!setCode) {
    return res.status(400).json({ error: 'Parámetro "set" es requerido' })
  }

  try {
    const allCards = []
    let page = 1
    let totalPages = 1

    do {
      const upstream = await fetch(
        `${POKEWALLET_BASE}/sets/${encodeURIComponent(setCode)}?page=${page}&limit=200`,
        { headers: { 'X-API-Key': apiKey } }
      )

      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Error en la API de PokéWallet', status: upstream.status })
      }

      const data = await upstream.json()
      if (data.disambiguation) {
        return res.status(300).json({ error: 'Código de set ambiguo, usa un set_id numérico', matches: data.matches })
      }

      allCards.push(...(data.cards || []))
      totalPages = data.pagination?.total_pages || 1
      page += 1
    } while (page <= totalPages)

    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.status(200).json({
      set: allCards[0]?.card_info?.set_name || setCode,
      total: allCards.length,
      cards: allCards
    })
  } catch (err) {
    return res.status(502).json({ error: 'No se pudo conectar con PokéWallet', detail: err.message })
  }
}