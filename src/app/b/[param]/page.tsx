import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBinderOgData } from '@/lib/og'
import PublicBinderPage from './binder-view'

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Metadata dinámica del binder público por clave corta (/b/<slug> o /b/<uuid>).
// El preview de WhatsApp/redes lo alimenta junto con opengraph-image.tsx.
export async function generateMetadata({
  params
}: {
  params: Promise<{ param: string }>
}): Promise<Metadata> {
  const { param } = await params
  const data = await getBinderOgData({ binderKey: param })
  if (!data) {
    return { title: 'Binder no encontrado' }
  }
  const owner = data.username ? `@${data.username}` : 'TCG Claim'
  const title = data.title
  const wants =
    data.wantlistCount > 0
      ? ` Busca ${data.wantlistCount} carta${data.wantlistCount !== 1 ? 's' : ''}.`
      : ''
  const description = `${data.cardCount} carta${data.cardCount !== 1 ? 's' : ''} · ${fmt(data.totalValue)} USD en el binder de ${owner}.${wants} Vende y cambia directo por WhatsApp.`
  return {
    title,
    description,
    alternates: { canonical: `/b/${param}` },
    openGraph: { title, description, url: `/b/${param}` }
  }
}

export default async function Page({ params }: { params: Promise<{ param: string }> }) {
  const { param } = await params
  // 404 real si el slug/uuid no resuelve a un binder público.
  const data = await getBinderOgData({ binderKey: param })
  if (!data) notFound()
  return <PublicBinderPage param={param} />
}
