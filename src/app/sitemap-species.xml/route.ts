import { getCardMetadataMap } from '@/lib/catalog'
import { speciesFromCardName } from '@/lib/pokedex'
import { slugify } from '@/lib/utils'
import { urlsetXml, xmlResponse } from '@/lib/sitemapXml'

export const dynamic = 'force-dynamic'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')

// Todas las especies de Pokémon del catálogo (/especie/<slug>), deduplicadas.
export async function GET() {
  const base = APP_URL
  if (!base) return new Response('', { status: 404 })

  const meta = await getCardMetadataMap()
  const speciesSet = new Set<string>()
  for (const card of meta.values()) {
    if (card.supertype !== 'Pokémon') continue
    const name = speciesFromCardName(card.name)
    if (!/^[a-z]/i.test(name)) continue
    speciesSet.add(slugify(name))
  }

  const entries = [...speciesSet].map((slug) => ({
    url: `${base}/especie/${slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.6
  }))

  return xmlResponse(urlsetXml(entries))
}