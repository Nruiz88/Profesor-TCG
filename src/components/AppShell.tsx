'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ResponsiveNav from '@/components/ResponsiveNav'
import SiteFooter from '@/components/SiteFooter'
import DonationFooter from '@/components/DonationFooter'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/profile'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const isHome = pathname === '/'
  const isLogin = pathname === '/login'
  const isOwnBinder = pathname === '/binder'
  const isLegal = pathname === '/terminos' || pathname === '/privacidad'
  const isV2 = pathname === '/v2'
  const isAbout = pathname === '/acerca'
  const showSidebar =
    !isHome &&
    !isLogin &&
    !isOwnBinder &&
    !isLegal &&
    !isV2 &&
    !isAbout

  // Cargar sesión y perfil del usuario.
  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      const u = data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null
      setUser(u)
      if (u) {
        fetch('/api/profile')
          .then(async (res) => {
            if (!res.ok) return
            const d = await res.json()
            if (mounted && d.profile) setProfile(d.profile)
          })
          .catch(() => {})
      } else {
        setProfile(null)
      }
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: session.user.email ?? undefined }
        : null
      setUser(u)
      if (!u) {
        setProfile(null)
      } else {
        fetch('/api/profile')
          .then(async (res) => {
            if (!res.ok) return
            const d = await res.json()
            if (mounted && d.profile) setProfile(d.profile)
          })
          .catch(() => {})
      }
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // ─── Home (v2) y /v2: ancho completo, sin sidebar ni footer (la home trae su propio footer) ───
  if (isV2 || isHome) {
    return (
      <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-200">
        <main className="flex-1">{children}</main>
      </div>
    )
  }

  // ─── Mercado y Buscados ya no existen como páginas (la home los concentra) ───

  if (!showSidebar) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1">{children}</main>
        {isOwnBinder ? <DonationFooter /> : <SiteFooter />}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090d16] text-slate-200">
      <div className="flex flex-1">
        <ResponsiveNav
          profile={profile}
          user={user}
          onShowProfile={() => {
            router.push('/ajustes')
          }}
          onShowClaims={() => router.push('/claims')}
        />
        <main className="min-w-0 flex-1 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      <DonationFooter />
    </div>
  )
}
