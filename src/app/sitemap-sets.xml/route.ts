import { getSets } from '@/lib/catalog'
import { urlsetXml, xmlResponse } from '@/lib/sitemapXml'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')

// Todas las expansiones del catálogo (/expansion/<setId>).
export async function GET() {
  const base = APP_URL
  if (!base) return new Response('', { status: 404 })

  const sets = await getSets()
  const entries = sets.map((s) => ({
    url: `${base}/expansion/${s.id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7
  }))

  return xmlResponse(urlsetXml(entries))
}