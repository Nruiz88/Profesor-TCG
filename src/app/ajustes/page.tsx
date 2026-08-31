import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ProfileSettingsSection from '@/components/profile/ProfileSettingsSection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ajustes de tu cuenta',
  description:
    'Configurá tu perfil de TCG Claim: nombre de usuario, datos de contacto y contraseña.',
  alternates: { canonical: '/ajustes' },
  openGraph: { url: '/ajustes' }
}

// Página de ajustes del usuario logueado: SOLO la configuración de la cuenta
// (datos, contraseña y perfil público editable). Separada del perfil público.
export default async function AjustesPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  let profile: {
    username: string
    whatsapp_number: string | null
    city: string | null
    country: string | null
    created_at?: string
  } | null = null

  if (user && serviceKey && url) {
    const admin = createAdminClient(url, serviceKey)
    const { data } = await admin
      .from('profiles')
      .select('username, whatsapp_number, city, country, created_at')
      .eq('id', user.id)
      .maybeSingle()
    if (data) profile = data
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-[#00ffcc]/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15">
              <span className="text-xl">⚙️</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Ajustes</h1>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Configurá tu cuenta, tu perfil público y tu contraseña.
          </p>
        </div>
      </div>

      <ProfileSettingsSection profile={profile} />
    </main>
  )
}