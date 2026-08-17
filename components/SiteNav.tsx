'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoutIcon } from '@/components/icons'

export interface NavUser {
  id: string
  email?: string
}

interface SiteNavProps {
  /** Texto que se agrega tras el logo, ej: "Explorar" */
  label?: string
  /** Página actual para resaltar el link correspondiente */
  active?: 'home' | 'explore' | 'binder' | 'offers'
  /** Usuario ya resuelto en el servidor (evita el parpadeo de "Ingresar") */
  initialUser?: NavUser | null
}

export default function SiteNav({ label, active, initialUser = null }: SiteNavProps) {
  const router = useRouter()
  const [user, setUser] = useState<NavUser | null>(initialUser)

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

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const linkClass = (isCurrent: boolean) =>
    `rounded-lg px-3 py-2 font-medium transition-colors ${
      isCurrent ? 'bg-white/5 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-400 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition-transform group-hover:scale-105">
            P
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Profesor TCG
            {label && (
              <span className="bg-gradient-to-r from-rose-400 to-rose-500 bg-clip-text font-semibold text-transparent">
                {' '}· {label}
              </span>
            )}
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-1 text-sm">
          <Link href="/" className={linkClass(active === 'home')}>
            Inicio
          </Link>
          <Link href="/explore" className={linkClass(active === 'explore')}>
            Explorar
          </Link>
          {user && (
            <>
              <Link href="/binder" className={linkClass(active === 'binder')}>
                Mi Binder
              </Link>
              <Link href="/offers" className={linkClass(active === 'offers')}>
                Ofertas
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/binder"
                className="hidden max-w-[13rem] truncate rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 md:block"
                title={user.email}
              >
                {user.email}
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-600/15 hover:text-red-300"
              >
                <LogoutIcon className="h-4 w-4" />
                <span className="hidden lg:inline">Salir</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
              >
                Ingresar
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-binder-accent px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition-colors hover:bg-rose-500"
              >
                Empezar gratis
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
