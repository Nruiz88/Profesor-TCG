import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { createClient } from '@/lib/supabase/server'
import { getNota, listNotas } from '@/lib/notas'
import MarkdownView from '@/components/notas/MarkdownView'

export const dynamic = 'force-dynamic'

interface NotaPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: NotaPageProps): Promise<Metadata> {
  const { slug } = await params
  const nota = await getNota(slug)
  return {
    title: nota ? `${nota.title} — Profesor TCG` : 'Nota no encontrada — Profesor TCG'
  }
}

export async function generateStaticParams() {
  const notas = await listNotas()
  return notas.map((n) => ({ slug: n.slug }))
}

export default async function NotaPage({ params }: NotaPageProps) {
  const { slug } = await params
  const nota = await getNota(slug)
  if (!nota) notFound()

  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  const todas = await listNotas()
  const index = todas.findIndex((n) => n.slug === slug)
  const prev = index > 0 ? todas[index - 1] : null
  const next = index >= 0 && index < todas.length - 1 ? todas[index + 1] : null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <SiteNav
        label="Notas"
        initialUser={user ? { id: user.id, email: user.email ?? undefined } : null}
      />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <Link
          href="/notas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          ← Volver a notas
        </Link>

        <article className="mt-8">
          <header className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-binder-accent">
              {nota.slug}.md
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {nota.title}
            </h1>
          </header>

          <div className="border-t border-slate-800/80 pt-8">
            <MarkdownView content={nota.content} />
          </div>
        </article>

        <nav className="mt-12 flex items-center justify-between border-t border-slate-800/60 pt-8">
          {prev ? (
            <Link
              href={`/notas/${prev.slug}`}
              className="max-w-[45%] text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              ← {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/notas/${next.slug}`}
              className="max-w-[45%] text-right text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              {next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
    </div>
  )
}
