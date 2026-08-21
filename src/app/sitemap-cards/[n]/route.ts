import { getCardMetadataMap } from '@/lib/catalog'
import { cardSlug } from '@/lib/catalogPages'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { urlsetXml, xmlResponse, CARDS_PER_SITEMAP } from '@/lib/sitemapXml'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')

// Última actividad por carta (binder_cards listadas en venta/cambio):
// indica frescura en el sitemap y prioriza el recrawl de Google.
async function activityByCardId(): Promise<Map<string, string>> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return new Map()
  try {
    const admin = createAdminClient(url, serviceKey)
    const { data: rows } = await admin
      .from('binder_cards')
      .select('card_id, updated_at')
      .or('is_for_sale.eq.true,is_for_trade.eq.true')
      .order('updated_at', { ascending: false })
    const map = new Map<string, string>()
    for (const r of rows || []) {
      const row = r as { card_id: string; updated_at: string }
      if (!map.has(row.card_id)) map.set(row.card_id, row.updated_at)
    }
    return map
  } catch {
    return new Map()
  }
}

// Sitemap de cartas por chunks (/sitemap-cards/1, /sitemap-cards/2, …).
// El índice (/sitemap.xml) calcula cuántos chunks hay según el tamaño real del
// catálogo. Cada chunk tiene hasta CARDS_PER_SITEMAP URLs (muy por debajo del
// límite de 50.000 que sugiere Google).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ n: string }> }
) {
  const base = APP_URL
  if (!base) return new Response('', { status: 404 })

  const { n } = await params
  const page = parseInt(n, 10)
  if (Number.isNaN(page) || page < 1) {
    return new Response('', { status: 404 })
  }

  const meta = await getCardMetadataMap()
  const cards = Array.from(meta.values())
  const chunks = Math.ceil(cards.length / CARDS_PER_SITEMAP)
  if (page > chunks) return new Response('', { status: 404 })

  const activity = await activityByCardId()
  const slice = cards.slice((page - 1) * CARDS_PER_SITEMAP, page * CARDS_PER_SITEMAP)
  const entries = slice.map((card) => {
    const lastMod = activity.get(card.id)
    return {
      url: `${base}/carta/${encodeURIComponent(card.id)}/${cardSlug(card.name)}`,
      ...(lastMod ? { lastModified: lastMod.slice(0, 10) } : {}),
      changeFrequency: 'weekly' as const,
      // Las cartas con actividad (precio/publicaciones) merecen más prioridad
      // y recrawl; el resto del catálogo queda en prioridad base.
      priority: lastMod ? 0.8 : 0.5
    }
  })

  return xmlResponse(urlsetXml(entries))
}