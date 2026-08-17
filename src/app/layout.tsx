import type { Metadata } from 'next'
import './globals.css'
import './vendor/pokemon-cards/pokemon-cards.css'
import '../components/modals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Profesor TCG — Virtual Binder',
  description: 'Gestor de colecciones de Pokémon TCG con precios de mercado',
  openGraph: {
    siteName: 'Profesor TCG',
    type: 'website',
    locale: 'es_AR'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}