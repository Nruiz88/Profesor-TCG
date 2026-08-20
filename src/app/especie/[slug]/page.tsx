import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getCatalogSpeciesPageData, type CatalogSpeciesPageData } from '@/lib/catalogPages'
import { formatPrice } from '@/lib/priceGuide'

export const dynamicParams = true
export const revalidate = 86400

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

// Pre-renderiza las especies más buscadas; el resto se genera on-demand y se
// cachea con ISR (revalidate = 86400s).
const STATIC_SPECIES = ['pikachu', 'charizard', 'mewtwo', 'gengar']

export async function generateStaticParams() {
  return STATIC_SPECIES.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await getCatalogSpeciesPageData(slug)
  if (!data) return { title: 'Pokémon no encontrado' }

  const title = `${data.name} — Todas las cartas y precios`
  const priceText = data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const description = [
    `Todas las cartas de ${data.name} del Pokémon TCG: ${data.cardCount} impresiones en distintas expansiones`,
    data.types.length > 0 ? `· Tipo: ${data.types.join(', ')}` : null,
    data.listingCount > 0
      ? `· ${data.listingCount} en venta/cambio${priceText ? ` desde ${priceText}` : ''}`
      : null,
    '— Comprá o vendé cartas de Pokémon TCG por WhatsApp en TCG Claim.'
  ]
    .filter(Boolean)
    .join(' ')

  const firstImage = data.prints.find((p) => p.image && !p.image.startsWith('data:'))?.image
  const images = firstImage
    ? [
        {
          url: firstImage,
          width: 734,
          height: 1024,
          alt: `Carta Pokémon ${data.name}`
        }
      ]
    : undefined

  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/especie/${data.slug}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${APP_URL}/especie/${data.slug}`,
      siteName: 'TCG Claim',
      locale: 'es_AR',
      images
    }
  }
}

interface FaqEntry {
  q: string
  a: string
}

function buildFaq(
  data: CatalogSpeciesPageData
): FaqEntry[] {
  const price = data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const rarest = [...data.prints]
    .filter((c) => c.rarity)
    .sort((a, b) => (b.rarity?.length ?? 0) - (a.rarity?.length ?? 0))
    .slice(0, 3)
  return [
    {
      q: `¿Cuántas cartas de ${data.name} existen?`,
      a: `En el catálogo de TCG Claim hay ${data.cardCount} impresiones de ${data.name} a lo largo de la historia del Pokémon TCG, desde las primeras expansiones hasta las más recientes.`
    },
    data.prints.length > 0
      ? {
          q: `¿Cuál es la carta de ${data.name} más valiosa?`,
          a: `El valor de las cartas de ${data.name} depende de la edición, la rareza y el estado.${rarest.length > 0 ? ` Las impresiones con rareza más alta en nuestro catálogo son ${rarest.map((c) => `${c.name} (${c.rarity})`).join(', ')}.` : ''}${price ? ` Hoy la publicación más barata de ${data.name} en TCG Claim está en ${price}.` : ''}`
        }
      : null,
    price
      ? {
          q: `¿Dónde comprar o vender cartas de ${data.name}?`,
          a: `En TCG Claim hay ${data.listingCount} publicaciones de cartas de ${data.name} con precios desde ${price}. Publicá las tuyas gratis y coordiná la venta o el cambio por WhatsApp sin comisiones.`
        }
      : null
  ].filter(Boolean) as FaqEntry[]
}

export default async function Page({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getCatalogSpeciesPageData(slug)
  if (!data) notFound()

  const faq = buildFaq(data)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${APP_URL}/explore` },
      { '@type': 'ListItem', position: 3, name: `Cartas de ${data.name}` }
    ]
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Cartas de ${data.name}`,
    numberOfItems: data.cardCount,
    itemListElement: data.prints.map((c, i) => ({
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

        {/* Header de la especie */}
        <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-binder-accent to-amber-500 text-2xl font-black text-white shadow-lg">
              {data.name[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Cartas de {data.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {data.cardCount} impresiones
                {data.types.length > 0 ? ` · Tipo: ${data.types.join(', ')}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.listingCount > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
                    {data.listingCount} en venta/cambio
                    {data.minPrice != null
                      ? ` desde ${formatPrice(data.minPrice, data.currency)}`
                      : ''}
                  </span>
                )}
                {data.minPrice != null && (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-bold text-slate-300">
                    Precio desde {formatPrice(data.minPrice, data.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Todas las impresiones */}
        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">Todas las cartas de {data.name}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {data.prints.map((c) => (
              <Link
                key={c.id}
                href={`/carta/${encodeURIComponent(c.id)}/${c.slug}`}
                className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-slate-600"
              >
                <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
                  <Image
                    src={c.image}
                    alt={`Carta Pokémon ${c.name}`}
                    fill
                    sizes="(min-width: 768px) 16vw, (min-width: 640px) 25vw, 33vw"
                    loading="lazy"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="px-2 py-2">
                  <p className="truncate text-xs font-semibold text-slate-200">{c.name}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    #{c.number}
                    {c.rarity ? ` · ${c.rarity}` : ''}
                  </p>
                </div>
              </Link>
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