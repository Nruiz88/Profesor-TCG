import { getCardMetadataMap } from '@/lib/catalog'
import { sitemapIndexXml, xmlResponse, CARDS_PER_SITEMAP } from '@/lib/sitemapXml'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')

// Sitemap index: apunta a los sub-sitemaps. El número de chunks de cartas se
// calcula con el tamaño real del catálogo (37k+ / 10k por archivo).
export async function GET() {
  if (!APP_URL) return new Response('', { status: 404 })

  const meta = await getCardMetadataMap()
  const chunks = Math.max(1, Math.ceil(meta.size / CARDS_PER_SITEMAP))
  const urls = [
    `${APP_URL}/sitemap-pages.xml`,
    `${APP_URL}/sitemap-sets.xml`,
    `${APP_URL}/sitemap-species.xml`,
    ...Array.from({ length: chunks }, (_, i) => `${APP_URL}/sitemap-cards/${i + 1}`)
  ]

  return xmlResponse(sitemapIndexXml(urls))
}