import type { Metadata } from 'next'
import { getBinderOgData } from '@/lib/og'
import PublicBinderByUsernameView from './binder-view'

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Metadata dinámica del binder público: la resuelve el server (la vista es un
// client component) y alimenta el preview de WhatsApp/redes junto con la
// imagen generada en opengraph-image.tsx.
export async function generateMetadata({
  params
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const data = await getBinderOgData({ username })
  if (!data) {
    return { title: 'Binder no encontrado · Profesor TCG' }
  }
  const owner = data.username ? `@${data.username}` : 'Profesor TCG'
  const title = `${data.title} · Profesor TCG`
  const wants =
    data.wantlistCount > 0
      ? ` Busca ${data.wantlistCount} carta${data.wantlistCount !== 1 ? 's' : ''}.`
      : ''
  const description = `${data.cardCount} carta${data.cardCount !== 1 ? 's' : ''} · ${fmt(data.totalValue)} USD en el binder de ${owner}.${wants} Vende y cambia directo por WhatsApp.`
  return {
    title,
    description,
    openGraph: { title, description }
  }
}

export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return <PublicBinderByUsernameView username={username} />
}
