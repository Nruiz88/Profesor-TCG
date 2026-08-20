import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCatalogSetPageData, type CatalogSetPageData } from '@/lib/catalogPages'
import { formatPrice } from '@/lib/priceGuide'

export const dynamicParams = true
export const revalidate = 86400

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

const STATIC_SET_IDS = ['base1', 'base2', 'sv1', 'sv3pt5']

// Pre-renderiza los sets más buscados; el resto se genera on-demand y se
// cachea con ISR (revalidate = 86400s).
export async function generateStaticParams() {
  return STATIC_SET_IDS.map((setId) => ({ setId }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ setId: string }>
}): Promise<Metadata> {
  const { setId } = await params
  const data = await getCatalogSetPageData(setId)
  if (!data) return { title: 'Expansión no encontrada' }

  const title = `${data.name} — Cartas y precios`
  const priceText = data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const description = [
    `Catálogo completo de la expansión ${data.name} (${data.series}): ${data.cardCount} cartas`,
    data.releaseDate ? `publicada el ${new Date(data.releaseDate).toLocaleDateString('es-AR', { year: 'numeric', month: 'long' })}` : null,
    data.listingCount > 0
      ? `· ${data.listingCount} en venta/cambio${priceText ? ` desde ${priceText}` : ''}`
      : null,
    '— Comprá o vendé cartas Pokémon TCG por WhatsApp en TCG Claim.'
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/expansion/${data.id}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${APP_URL}/expansion/${data.id}`,
      siteName: 'TCG Claim',
      locale: 'es_AR',
      images: data.logo
        ? [{ url: data.logo, alt: `Logo de la expansión ${data.name}` }]
        : undefined
    }
  }
}

interface FaqEntry {
  q: string
  a: string
}

function buildFaq(
  data: CatalogSetPageData,
  list: { name: string; number: string; rarity: string | null }[]
): FaqEntry[] {
  const price = data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const top = list
    .filter((c) => c.rarity && /illustration|secret|hyper|ultra|vmax|vstar|gold|rainbow/i.test(c.rarity))
    .slice(0, 3)
  return [
    {
      q: `¿Cuáles son las mejores cartas de ${data.name}?`,
      a:
        top.length > 0
          ? `Las cartas más buscadas de ${data.name} suelen ser ${top.map((c) => `${c.name} (n.º ${c.number})`).join(', ')}. Consultá las publicaciones activas en TCG Claim para ver precios actuales.`
          : `En TCG Claim podés explorar las ${data.cardCount} cartas de ${data.name} y ver cuáles tienen publicaciones activas con precio.`
    },
    {
      q: `¿Cuántas cartas tiene la expansión ${data.name}?`,
      a: `La colección base de ${data.name} tiene ${data.printedTotal} cartas numeradas (${data.total} en total contando secretos). En TCG Claim tenés ${data.cardCount} en el catálogo.`
    },
    price
      ? {
          q: `¿Cuánto cuesta una carta de ${data.name}?`,
          a: `Hoy hay ${data.listingCount} publicaciones de cartas de ${data.name} en TCG Claim, con precios desde ${price}. El valor depende de la carta, su rareza, estado e idioma.`
        }
      : null
  ].filter(Boolean) as FaqEntry[]
}

export default async function Page({
  params
}: {
  params: Promise<{ setId: string }>
}) {
  const { setId } = await params
  const data = await getCatalogSetPageData(setId)
  if (!data) notFound()

  const faq = buildFaq(data, data.featured)
  const exploreHref = `/explore?set=${encodeURIComponent(data.id)}`

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${APP_URL}/explore` },
      { '@type': 'ListItem', position: 3, name: data.name }
    ]
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Cartas de ${data.name}`,
    numberOfItems: data.cardCount,
    itemListElement: data.featured.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      url: `${APP_URL}/carta/${encodeURIComponent(c.id)}/${c.slug}`
    }))
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-white">
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/explore" className="transition-colors hover:text-white">
            Marketplace
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-200">{data.name}</span>
        </nav>

        {/* Header del set */}
        <header className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center gap-5">
            {data.logo && (
              <div className="flex h-16 w-52 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950/60">
                <Image
                  src={data.logo}
                  alt={`Logo de la expansión ${data.name}`}
                  width={200}
                  height={64}
                  className="h-full w-auto object-contain"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {data.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {data.series}
                {data.releaseDate
                  ? ` · ${new Date(data.releaseDate).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}`
                  : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Stat label="Cartas" value={String(data.cardCount)} />
                {data.listingCount > 0 && (
                  <Stat label="En venta/cambio" value={String(data.listingCount)} />
                )}
                {data.minPrice != null && (
                  <Stat label="Desde" value={formatPrice(data.minPrice, data.currency)} accent />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Destacadas */}
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Destacadas de {data.name}</h2>
            <Link
              href={exploreHref}
              className="text-sm font-semibold text-rose-400 transition-colors hover:text-rose-300"
            >
              Ver en el marketplace →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data.featured.map((c) => (
              <CardThumb key={c.id} card={c} />
            ))}
          </div>
        </section>

        {/* Checklist completo */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">Checklist completo ({data.cardCount} cartas)</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data.cards.map((c) => (
              <CardThumb key={c.id} card={c} />
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-white">Preguntas frecuentes</h2>
          <div className="mt-4 space-y-2">
            {faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-4"
              >
                <summary className="cursor-pointer select-none text-sm font-semibold text-white">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent = false
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-bold ${
        accent ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-300'
      }`}
    >
      <span className="mr-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {value}
    </span>
  )
}

function CardThumb({ card }: { card: { id: string; name: string; number: string; rarity: string | null; image: string; slug: string } }) {
  return (
    <Link
      href={`/carta/${encodeURIComponent(card.id)}/${card.slug}`}
      className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-slate-600"
    >
      <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
        <Image
          src={card.image}
          alt={`Carta Pokémon ${card.name} ${card.number}`}
          fill
          sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 33vw"
          loading="lazy"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="px-2 py-2">
        <p className="truncate text-xs font-semibold text-slate-200">{card.name}</p>
        <p className="truncate text-[10px] text-slate-500">
          #{card.number}
          {card.rarity ? ` · ${card.rarity}` : ''}
        </p>
      </div>
    </Link>
  )
}