'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import ResponsiveNav from '@/components/ResponsiveNav'
import { createClient } from '@/lib/supabase/client'
import { getUserBinders } from '@/lib/binders'
import type { Profile } from '@/lib/profile'

interface ShellBinder {
  id: string
  title: string
  is_public?: boolean
}

/**
 * Envoltorio global que aplica la navegación responsive (ResponsiveNav) para
 * todas las rutas salvo la home y el binder propio (que ya integra su propia
 * navegación con lógica local). En desktop se dibuja el sidebar vertical a la
 * izquierda; en mobile, la barra inferior con popovers.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [binders, setBinders] = useState<ShellBinder[]>([])
  const [updating, setUpdating] = useState(false)

  const isHome = pathname === '/'
  const isLogin = pathname === '/login'
  const isOwnBinder = pathname === '/binder'
  const showSidebar = !isHome && !isLogin && !isOwnBinder

  // Cargar sesión y perfil/binders del usuario.
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
        getUserBinders(u.id)
          .then((list) => {
            if (mounted) setBinders(list || [])
          })
          .catch(() => {})
      } else {
        setProfile(null)
        setBinders([])
      }
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: session.user.email ?? undefined }
        : null
      setUser(u)
      if (!u) {
        setProfile(null)
        setBinders([])
      } else {
        fetch('/api/profile')
          .then(async (res) => {
            if (!res.ok) return
            const d = await res.json()
            if (mounted && d.profile) setProfile(d.profile)
          })
          .catch(() => {})
        getUserBinders(u.id)
          .then((list) => mounted && setBinders(list || []))
          .catch(() => {})
      }
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200">
      <ResponsiveNav
        profile={profile}
        user={user}
        binders={binders}
        activeBinderId={null}
        onSelectBinder={(id) => router.push(`/binder?binderId=${id}`)}
        onCreateBinder={() => router.push('/binder')}
        onRefreshPrices={async () => {
          if (updating) return
          setUpdating(true)
          try {
            await fetch('/api/binder/update-prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            })
          } catch {
            // silencioso
          } finally {
            setUpdating(false)
          }
        }}
        updating={updating}
        onShowProfile={() => {
          if (profile?.username) {
            router.push(`/profile/${encodeURIComponent(profile.username)}?tab=settings`)
          }
        }}
        onShowClaims={() => router.push('/binder')}
      />
      <div className="pb-20 lg:pb-0 lg:pl-64">{children}</div>
    </div>
  )
}
