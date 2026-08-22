import type { Metadata, Viewport } from 'next'
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
import SWRegister from '@/components/SWRegister'
import InstallPWA from '@/components/InstallPWA'
import { splashLinks } from '@/lib/splash-links'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'TCG Claim | Mercado P2P de Cartas TCG',
    template: '%s · TCG Claim'
  },
  description:
    'Comprá, vendé y permutá cartas TCG sin comisiones. Conectá tu Binder en 3D directo a WhatsApp.',
  applicationName: 'TCG Claim',
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  openGraph: {
    siteName: 'TCG Claim',
    type: 'website',
    locale: 'es_AR',
    title: 'TCG Claim | Mercado P2P & Binders 3D',
    description:
      'Comprá, vendé y permutá cartas TCG sin comisiones. Conectá tu Binder en 3D directo a WhatsApp.'
  }
}

export const viewport: Viewport = {
  themeColor: '#0a0c10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TCG Claim" />
        {splashLinks.map(({ href, media }) => (
          <link key={href} rel="apple-touch-startup-image" href={href} media={media} />
        ))}
      </head>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <SWRegister />
        <InstallPWA />
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