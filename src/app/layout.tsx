import type { Metadata } from 'next'
import './globals.css'
import './vendor/pokemon-cards/pokemon-cards.css'
import '../components/modals.css'

export const metadata: Metadata = {
  title: 'Profesor TCG — Virtual Binder',
  description: 'Gestor de colecciones de Pokémon TCG con precios de mercado'
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