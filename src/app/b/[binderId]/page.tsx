import type { Metadata } from 'next'
import { getBinderOgData } from '@/lib/og'
import PublicBinderView from './binder-view'

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export async function generateMetadata({
  params
}: {
  params: Promise<{ binderId: string }>
}): Promise<Metadata> {
  const { binderId } = await params
  const data = await getBinderOgData({ binderId })
  if (!data) {
    return { title: 'Binder no encontrado · Profesor TCG' }
  }
  const owner = data.username ? `@${data.username}` : 'Profesor TCG'
  const title = `${data.title} · Profesor TCG`
  const description = `${data.cardCount} carta${data.cardCount !== 1 ? 's' : ''} · ${fmt(data.totalValue)} USD en el binder de ${owner}. Vende y cambia directo por WhatsApp.`
  return {
    title,
    description,
    openGraph: { title, description }
  }
}

export default async function Page({ params }: { params: Promise<{ binderId: string }> }) {
  const { binderId } = await params
  return <PublicBinderView binderId={binderId} />
}
