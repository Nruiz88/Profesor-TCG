import type { Metadata } from 'next'
import BuscadosPage from './BuscadosPage'

export const metadata: Metadata = {
  title: 'Buscadas de la comunidad | Wantlist de cartas TCG',
  description:
    'Cartas que la comunidad está buscando. Sumá tu wantlist y coordiná trueques directo por WhatsApp.',
  alternates: { canonical: '/buscados' },
  openGraph: { url: '/buscados' }
}

export default function Page() {
  return <BuscadosPage />
}