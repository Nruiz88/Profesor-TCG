import type { Metadata } from 'next'
import MarketNav from '@/components/MarketNav'
import LiveActivityTicker from '@/components/LiveActivityTicker'
import GhostPokemon from '@/components/GhostPokemon'
import HomeV2 from './v2/HomeV2'
import HomeV2Footer from './v2/HomeV2Footer'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/profile'
import './v2/v2-page.css'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

export const metadata: Metadata = {
  title: 'TCG Claim | Mercado P2P de Cartas TCG & Binder en 3D',
  description:
    'Comprá, vendé y permutá cartas TCG sin comisiones. Digitalizá tu binder en 3D, publicá tus cartas y coordiná por WhatsApp.',
  alternates: { canonical: '/' },
  openGraph: { url: '/' }
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, whatsapp_number, country, city, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle()
    profile = (data as Profile | null) ?? null
  }

  return (
    <>
      {/* Datos estructurados (JSON-LD) de la marca y del sitio: habilita el
          sitelinks searchbox y la marca en resultados de Google. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                '@id': `${APP_URL}/#organization`,
                name: 'TCG Claim',
                url: `${APP_URL}/`,
                logo: `${APP_URL}/brand/logo-invertido.png`,
                sameAs: ['https://discord.gg/NxuWmFKPuZ', 'https://www.instagram.com/tcgclaim']
              },
              {
                '@type': 'WebSite',
                '@id': `${APP_URL}/#website`,
                url: `${APP_URL}/`,
                name: 'TCG Claim',
                publisher: { '@id': `${APP_URL}/#organization` },
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${APP_URL}/?q={search_term_string}`
                  },
                  'query-input': 'required name=search_term_string'
                }
              }
            ]
          })
        }}
      />
      <div className="v2p-root pb-20 lg:pb-0">
        {/* Header superior + cintillo de actividad: bajan juntos pegados al tope */}
        <div className="v2p-header">
          <MarketNav
            user={user ? { id: user.id, email: user.email ?? undefined } : null}
            profile={profile}
          />
          <LiveActivityTicker />
        </div>
        <GhostPokemon />
        <HomeV2
          user={user ? { id: user.id, email: user.email ?? undefined } : null}
          profile={profile}
        />
        <HomeV2Footer />
      </div>
    </>
  )
}