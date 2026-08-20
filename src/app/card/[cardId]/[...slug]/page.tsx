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
    return { title: 'Carta no encontrada · TCG Claim' }
  }
  const owner = data.username ? `por @${data.username}` : 'en TCG Claim'
  const title = `${data.name} · TCG Claim`
  const description = `${data.set_name} · #${data.number} ${owner}. ${fmt(data.price, data.currency)}${data.isReserved ? ' · Reservada 24h' : ''} — coordiná directo por WhatsApp.`

  // URL absoluta del og:image: los crawlers de redes (WhatsApp, etc.) necesitan
  // una URL completa, no relativa, para generar el preview de la carta.
  const headerStore = await headers()
  const proto = headerStore.get('x-forwarded-proto') ?? 'https'
  const host = headerStore.get('host') ?? 'profesor-tcg.vercel.app'
  const origin = `${proto}://${host}`
  const ogImageUrl = `${origin}/card/${cardId}/opengraph-image`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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
  return <PublicCardView cardId={cardId} />
}
