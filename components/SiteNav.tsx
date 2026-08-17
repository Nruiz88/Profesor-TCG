'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoutIcon, MenuIcon, XIcon } from '@/components/icons'

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
  const pathname = usePathname()
  const [user, setUser] = useState<NavUser | null>(initialUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

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

  // Cerrar el menú al navegar
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Cerrar al hacer clic afuera o con Escape
  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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

  const mobileLinkClass = (isCurrent: boolean) =>
    `block rounded-xl px-3 py-2.5 font-medium transition-colors ${
      isCurrent ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#090d16]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-x-4 px-4 py-3.5">
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

        {/* Links de escritorio */}
        <div className="hidden items-center gap-1 text-sm md:flex">
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

        {/* Acciones de sesión (escritorio) */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                href="/binder"
                className="hidden max-w-[13rem] truncate rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 lg:block"
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

        {/* Menú hamburguesa (mobile) */}
        <div className="relative md:hidden" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
              {user && (
                <div className="mb-1 rounded-xl bg-white/5 px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-white" title={user.email}>
                    {user.email}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-0.5 text-sm">
                <Link href="/" className={mobileLinkClass(active === 'home')}>
                  Inicio
                </Link>
                <Link href="/explore" className={mobileLinkClass(active === 'explore')}>
                  Explorar
                </Link>
                {user && (
                  <>
                    <Link href="/binder" className={mobileLinkClass(active === 'binder')}>
                      Mi Binder
                    </Link>
                    <Link href="/offers" className={mobileLinkClass(active === 'offers')}>
                      Ofertas
                    </Link>
                  </>
                )}
              </div>

              <div className="my-2 h-px bg-slate-800" />

              {user ? (
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-600/15 hover:text-red-300"
                >
                  <LogoutIcon className="h-4 w-4" />
                  Salir
                </button>
              ) : (
                <div className="flex flex-col gap-2 p-1">
                  <Link
                    href="/login"
                    className="rounded-xl border border-slate-700 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl bg-binder-accent px-3 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-500"
                  >
                    Empezar gratis
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
