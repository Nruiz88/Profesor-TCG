import type { Metadata } from 'next'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { createClient } from '@/lib/supabase/server'
import { listNotas } from '@/lib/notas'

export const metadata: Metadata = {
  title: 'Notas — Profesor TCG'
}

export default async function NotasPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()
  const notas = await listNotas()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <SiteNav
        initialUser={user ? { id: user.id, email: user.email ?? undefined } : null}
      />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-binder-accent">
          Bitácora del proyecto
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Notas de desarrollo
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Documentación y registro de cambios del proyecto, sincronizada con la carpeta de
          Obsidian del repositorio.
        </p>

        <ul className="mt-10 space-y-3">
          {notas.map((nota) => (
            <li key={nota.slug}>
              <Link
                href={`/notas/${nota.slug}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 transition-colors hover:border-slate-600 hover:bg-slate-900"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">
                    {nota.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {nota.slug}.md
                  </span>
                </span>
                <span className="text-slate-500 transition-colors group-hover:text-white">
                  →
                </span>
              </Link>
            </li>
          ))}
          {notas.length === 0 && (
            <li className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-8 text-center text-sm text-slate-500">
              No hay notas en la carpeta <code className="text-slate-400">notas/</code>.
            </li>
          )}
        </ul>

        <div className="mt-12 border-t border-slate-800/60 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Volver a la página principal
          </Link>
        </div>
      </main>
    </div>
  )
}
