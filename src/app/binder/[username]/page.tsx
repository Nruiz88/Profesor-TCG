import type { Metadata } from 'next'
import { getBinderOgData } from '@/lib/og'
import PublicBinderByUsernameView from './binder-view'

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Metadata dinámica del binder público: la resuelve el server (la vista es un
// client component) y alimenta el preview de WhatsApp/redes junto con la
// imagen generada en opengraph-image.tsx. Si llega ?binderId=<id> se muestra
// ese binder concreto; sin él, el primer binder público del usuario.
export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ binderId?: string }>
}): Promise<Metadata> {
  const { username } = await params
  const { binderId } = await searchParams
  const data = await getBinderOgData(binderId ? { binderId } : { username })
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
  const url = binderId ? `/binder/${username}?binderId=${binderId}` : `/binder/${username}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url }
  }
}

export default async function Page({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ binderId?: string }>
}) {
  const { username } = await params
  const { binderId } = await searchParams
  return <PublicBinderByUsernameView username={username} binderId={binderId} />
}
