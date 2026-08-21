import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getCardOgData } from '@/lib/og'
import PublicCardView from './card-view'

const fmt = (n: number | null, currency: string) =>
  n != null
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    : 'Consultar precio'

export async function generateMetadata({
  params
}: {
  params: Promise<{ cardId: string; slug: string[] }>
}): Promise<Metadata> {
  const { cardId } = await params
  const data = await getCardOgData(cardId)
  if (!data) {
    return { title: 'Carta no encontrada' }
  }
  const owner = data.username ? `por @${data.username}` : 'en TCG Claim'
  const title = data.name
  const description = `${data.set_name} · #${data.number} ${owner}. ${fmt(data.price, data.currency)}${data.isReserved ? ' · Reservada 24h' : ''} — coordiná directo por WhatsApp.`

  // URL absoluta del og:image: los crawlers de redes (WhatsApp, etc.) necesitan
  // una URL completa, no relativa, para generar el preview de la carta.
  const headerStore = await headers()
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const host = headerStore.get('host') ?? 'tcgclaim.online'
  const origin = `${proto}://${host}`
  const ogImageUrl = `${origin}/card/${cardId}/opengraph-image`
  const canonicalUrl = `${origin}/card/${cardId}/${data.name.split(' ').join('-').toLowerCase()}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      // La página vive en un catch-all ([...slug]) y Next.js no hereda el
      // opengraph-image.tsx del segmento padre [cardId], así que lo
      // referenciamos explícitamente (la ruta /card/[cardId]/opengraph-image
      // sí existe y se genera al vuelo con @vercel/og).
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: 'Carta en TCG Claim' }]
    }
  }
}

export default async function Page({ params }: { params: Promise<{ cardId: string; slug: string[] }> }) {
  const { cardId } = await params
  const data = await getCardOgData(cardId)

  // Datos estructurados (JSON-LD) para SEO: schema de Product/Offer.
  // Ayuda a Google a mostrar rich snippets con el precio y la disponibilidad.
  let jsonLd: object | null = null
  if (data) {
    const headerStore = await headers()
    const proto = headerStore.get('x-forwarded-proto') ?? 'https'
    const host = headerStore.get('host') ?? 'tcgclaim.online'
    const origin = `${proto}://${host}`
    const canonicalUrl = `${origin}/card/${cardId}/${data.name.split(' ').join('-').toLowerCase()}`
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: data.name,
      image: data.image || undefined,
      description: `${data.set_name} · #${data.number}${data.username ? ` por @${data.username}` : ''} — cartas Pokémon TCG en venta y cambio por WhatsApp.`,
      brand: { '@type': 'Brand', name: 'TCG Claim' },
      url: canonicalUrl,
      offers: {
        '@type': 'Offer',
        price: data.price != null ? data.price : undefined,
        priceCurrency: data.currency || 'USD',
        availability:
          data.isReserved
            ? 'https://schema.org/Reserved'
            : 'https://schema.org/InStock',
        seller: data.username ? { '@type': 'Person', name: `@${data.username}` } : undefined
      }
    }
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PublicCardView cardId={cardId} />
    </>
  )
}
