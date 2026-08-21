import type { Metadata } from 'next'
import ExplorePage from './ExplorePage'

export const metadata: Metadata = {
  title: 'Marketplace de cartas TCG | Explorar ventas y trueques',
  description:
    'Explorá cartas en venta e intercambio con precio en vivo. Filtrá por set, variante, tipo o ciudad y contactá directo por WhatsApp.',
  alternates: { canonical: '/explore' },
  openGraph: { url: '/explore' }
}

export default function Page() {
  return <ExplorePage />
}