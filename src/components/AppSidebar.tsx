'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SidebarMenu, {
  type SidebarBinder,
  type SidebarMenuProps
} from '@/components/SidebarMenu'
import type { Profile } from '@/lib/profile'

interface AppSidebarProps {
  profile: Profile | null
  user: { id: string; email?: string } | null
  binders: SidebarBinder[]
  activeBinderId: string | null
  onSelectBinder: (id: string) => void
  onCreateBinder: () => void
  onRefreshPrices: () => void
  updating: boolean
  onShowProfile: () => void
  onShowClaims: () => void
}

function useActivePath() {
  const pathname = usePathname()
  return (p: string) => pathname === p || pathname.startsWith(`${p}/`)
}

/**
 * Barra lateral fija (estilo dashboard): reemplaza el header superior en
 * desktop. Contiene la navegación completa agrupada por secciones y el
 * perfil del usuario en el footer. Solo visible en lg+ (en mobile navega
 * el BottomNav).
 */
export default function AppSidebar(props: AppSidebarProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(props.user)
  const [pendingOffers, setPendingOffers] = useState(0)
  const isActive = useActivePath()

  // Sincronizar sesión en el cliente (auth de Supabase)
  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? undefined } : null)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(
        session?.user ? { id: session.user.id, email: session.user.email ?? undefined } : null
      )
    })
    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setUser(props.user)
  }, [props.user])

  // Badge de ofertas pendientes
  useEffect(() => {
    if (!user) {
      setPendingOffers(0)
      return
    }
    let active = true
    fetch('/api/offers/count')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (active) setPendingOffers(data.pending ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.id, pathname])

  const menuProps: SidebarMenuProps = {
    ...props,
    user,
    pendingOffers,
    isActive,
    onClose: () => {},
    showHeader: true
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-800/60 bg-[#0a0c10] lg:block">
      <SidebarMenu {...menuProps} />
    </aside>
  )
}
