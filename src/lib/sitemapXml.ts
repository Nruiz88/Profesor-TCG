// ============================================================================
// Construcción de sitemaps XML (sitemap index + sub-sitemaps)
// ============================================================================
// Google sugiere un máximo de 50.000 URLs por sitemap. Con el catálogo de 37k+
// cartas conviene dividir: un sitemap index en /sitemap.xml apunta a
// sub-sitemaps por tipo de contenido (páginas/binders, sets, especies y cartas
// partidas en chunks de 10k URLs).
// ============================================================================

export const CARDS_PER_SITEMAP = 10000

export interface SitemapEntry {
  url: string
  lastModified?: string
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export function urlsetXml(entries: SitemapEntry[]): string {
  const items = entries
    .map((e) => {
      const parts = [`    <loc>${e.url}</loc>`]
      if (e.lastModified) parts.push(`    <lastmod>${e.lastModified}</lastmod>`)
      if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`)
      if (e.priority != null) parts.push(`    <priority>${e.priority}</priority>`)
      return `  <url>\n${parts.join('\n')}\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>`
}

export function sitemapIndexXml(urls: string[]): string {
  const items = urls
    .map((u) => `  <sitemap><loc>${u}</loc></sitemap>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>`
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    }
  })
}