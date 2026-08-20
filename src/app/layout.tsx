import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import './vendor/pokemon-cards/pokemon-cards.css'
import '../components/modals.css'
import '../components/banners.css'
import '../components/buttons.css'
import '../components/forms.css'
import '../components/marketplace.css'
import '../components/claim.css'
import '../components/activity.css'
import AppShell from '@/components/AppShell'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'TCG Claim — Virtual Binder',
  description: 'Gestor de colecciones de Pokémon TCG con precios de mercado',
  openGraph: {
    siteName: 'TCG Claim',
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
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}