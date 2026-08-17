import type { Metadata } from 'next'
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
    return { title: 'Carta no encontrada · Profesor TCG' }
  }
  const owner = data.username ? `por @${data.username}` : 'en Profesor TCG'
  const title = `${data.name} · Profesor TCG`
  const description = `${data.set_name} · #${data.number} ${owner}. ${fmt(data.price, data.currency)}${data.isReserved ? ' · Reservada 24h' : ''} — coordiná directo por WhatsApp.`
  return {
    title,
    description,
    openGraph: { title, description }
  }
}

export default async function Page({ params }: { params: Promise<{ cardId: string; slug: string[] }> }) {
  const { cardId } = await params
  return <PublicCardView cardId={cardId} />
}
