import type { Metadata } from 'next'
import Script from 'next/script'
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'TCG Claim | Mercado P2P de Cartas TCG',
    template: '%s · TCG Claim'
  },
  description:
    'Comprá, vendé y permutá cartas TCG sin comisiones. Conectá tu Binder en 3D directo a WhatsApp.',
  openGraph: {
    siteName: 'TCG Claim',
    type: 'website',
    locale: 'es_AR',
    title: 'TCG Claim | Mercado P2P & Binders 3D',
    description:
      'Comprá, vendé y permutá cartas TCG sin comisiones. Conectá tu Binder en 3D directo a WhatsApp.'
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <meta
          name="google-site-verification"
          content="jhN3WXBxo58r9qKNfoM0_B6PzTcW4PonkcfjkGrG9Ho"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <Analytics />
        <SpeedInsights />
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-MWQY48W6F1"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MWQY48W6F1');
          `}
        </Script>
      </body>
    </html>
  )
}