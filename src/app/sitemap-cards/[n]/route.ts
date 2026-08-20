import { getCardMetadataMap } from '@/lib/catalog'
import { cardSlug } from '@/lib/catalogPages'
import { urlsetXml, xmlResponse, CARDS_PER_SITEMAP } from '@/lib/sitemapXml'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')

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

  const slice = cards.slice((page - 1) * CARDS_PER_SITEMAP, page * CARDS_PER_SITEMAP)
  const entries = slice.map((card) => ({
    url: `${base}/carta/${encodeURIComponent(card.id)}/${cardSlug(card.name)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))

  return xmlResponse(urlsetXml(entries))
}