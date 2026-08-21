import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  getCatalogCardPageData,
  getCatalogStaticParams,
  cardSlug,
  type CatalogCardPageData
} from '@/lib/catalogPages'
import {
  buildCardmarketUrl,
  buildEbayUrl,
  buildPriceChartingUrl,
  buildTcgPlayerUrl,
  formatPrice
} from '@/lib/priceGuide'

export const dynamicParams = true
export const revalidate = 3600

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

// Pre-renderiza las cartas con actividad en el marketplace; el resto se
// genera on-demand y se cachea con ISR (revalidate = 3600s).
export async function generateStaticParams() {
  return getCatalogStaticParams()
}

function catalogUrl(data: CatalogCardPageData): string {
  return `${APP_URL}/carta/${encodeURIComponent(data.id)}/${cardSlug(data.name)}`
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ cardId: string; slug: string[] }>
}): Promise<Metadata> {
  const { cardId } = await params
  const data = await getCatalogCardPageData(cardId)
  if (!data) return { title: 'Carta no encontrada' }

// Title con el set para distribuir keywords (nombre + set). El template de
// la app agrega " · TCG Claim", así que si queda muy largo volvemos al
// formato corto con solo el nombre.
  const titleWithSet = `${data.name} #${data.number} · ${data.set_name} — Precios y Claims`
  const title =
    titleWithSet.length <= 55
      ? titleWithSet
      : `${data.name} #${data.number} — Precios y Claims`
  const priceText =
    data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const description = `Encontrá ${data.name} del set ${data.set_name} en TCG Claim. Comprá, vendé y permutá directo por WhatsApp en Latam sin comisiones.${data.listingCount > 0 && priceText ? ` Hay ${data.listingCount} publicación${data.listingCount !== 1 ? 'es' : ''} desde ${priceText}.` : ''}`

  return {
    title,
    description,
    alternates: { canonical: catalogUrl(data) },
    openGraph: {
      title,
      description,
      type: 'website',
      url: catalogUrl(data),
      siteName: 'TCG Claim',
      locale: 'es_AR'
      // og:image lo genera opengraph-image.tsx de este segmento (imagen de la
      // carta con precio y marca), mejor que la imagen cruda de 734x1024.
    }
  }
}

interface FaqEntry {
  q: string
  a: string
}

function buildFaq(data: CatalogCardPageData): FaqEntry[] {
  const price = data.minPrice != null ? formatPrice(data.minPrice, data.currency) : null
  const avg = data.avgPrice != null ? formatPrice(data.avgPrice, data.currency) : null
  const topCountries = data.countries.slice(0, 3)
  const topCountry = data.countries[0]
  return [
    avg
      ? {
          q: `¿Cuánto cuesta ${data.name} en Latinoamérica?`,
          a: `En TCG Claim los usuarios la tienen publicada a un precio promedio de ${avg}. El precio final depende del estado, el idioma y la edición de cada publicación.`
        }
      : null,
    topCountry
      ? {
          q: `¿Dónde puedo comprar ${data.name} en mi país?`,
          a:
            topCountries.length > 1
              ? `Actualmente hay ${data.listingCount} publicaciones activas de ${data.name} con conexión directa a WhatsApp en ${topCountries.map((c) => c.country).join(', ')}.`
              : `Actualmente hay ${topCountry.count} publicación${topCountry.count !== 1 ? 'es' : ''} activa${topCountry.count !== 1 ? 's' : ''} en ${topCountry.country} con conexión directa a WhatsApp.`
        }
      : null,
    {
      q: `¿Cuánto vale ${data.name} de ${data.set_name}?`,
      a:
        data.listingCount > 0 && price
          ? `En TCG Claim hay ${data.listingCount} publicación${data.listingCount !== 1 ? 'es' : ''} de ${data.name} (${data.setId.toUpperCase()} ${data.number}). El precio más bajo es ${price}. El valor final depende del estado de la carta, el idioma y la edición.`
          : `El valor de ${data.name} depende del estado, idioma y edición. Hoy no hay publicaciones activas de esta carta en TCG Claim; publicá la tuya gratis para ver cuánto piden los compradores.`
    },
    {
      q: `¿Dónde comprar o vender ${data.name}?`,
      a: `En TCG Claim podés publicar tu ${data.name} gratis y coordinás la venta o el cambio por WhatsApp directamente con la otra persona, sin comisiones. Si la carta tiene publicaciones activas, vas a verlas en esta página con el precio de cada vendedor.`
    },
    data.rarity
      ? {
          q: `¿Qué rareza tiene ${data.name}?`,
          a: `${data.name} (${data.setId.toUpperCase()} ${data.number}) es una carta de rareza ${data.rarity} de la expansión ${data.set_name}.`
        }
      : {
          q: `¿Qué tipo de carta es ${data.name}?`,
          a: `${data.name} (${data.setId.toUpperCase()} ${data.number}) pertenece a la expansión ${data.set_name}${data.supertype ? ` y es una carta de tipo ${data.supertype}` : ''}.`
        },
    data.printedTotal > 0
      ? {
          q: `¿Cuántas cartas tiene la expansión ${data.set_name}?`,
          a: `La expansión ${data.set_name} tiene ${data.printedTotal} cartas numeradas en su colección base. ${data.name} es la carta número ${data.number} de ese set.`
        }
      : null
  ].filter(Boolean) as FaqEntry[]
}

export default async function Page({
  params
}: {
  params: Promise<{ cardId: string; slug: string[] }>
}) {
  const { cardId } = await params
  const data = await getCatalogCardPageData(cardId)
  if (!data) notFound()

  const slug = cardSlug(data.name)
  const faq = buildFaq(data)
  const setHref = `/explore?set=${encodeURIComponent(data.setId)}`
  const guideLinks = [
    {
      label: 'TCGPlayer',
      href: buildTcgPlayerUrl({
        cardName: data.name,
        setId: data.setId,
        set_name: data.set_name,
        number: data.number
      })
    },
    {
      label: 'eBay (ventas reales)',
      href: buildEbayUrl({
        cardName: data.name,
        setId: data.setId,
        set_name: data.set_name,
        number: data.number
      })
    },
    {
      label: 'PriceCharting',
      href: buildPriceChartingUrl({
        cardName: data.name,
        setId: data.setId,
        set_name: data.set_name,
        number: data.number
      })
    },
    {
      label: 'Cardmarket',
      href: buildCardmarketUrl({
        cardName: data.name,
        setId: data.setId,
        set_name: data.set_name,
        number: data.number
      })
    }
  ]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${APP_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${APP_URL}/explore` },
      { '@type': 'ListItem', position: 3, name: data.set_name, item: `${APP_URL}${setHref}` },
      { '@type': 'ListItem', position: 4, name: data.name }
    ]
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    image: data.image,
    description: `${data.name} — carta ${data.number} de la expansión ${data.set_name} (${data.setId.toUpperCase()}).`,
    brand: { '@type': 'Brand', name: 'TCG Claim' },
    url: catalogUrl(data),
    offers:
      data.minPrice != null
        ? {
            '@type': 'AggregateOffer',
            lowPrice: data.minPrice,
            priceCurrency: data.currency,
            offerCount: data.listingCount,
            availability:
              data.listingCount > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock'
          }
        : undefined
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Migas de pan */}
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-white">
            Inicio
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/explore" className="transition-colors hover:text-white">
            Marketplace
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/expansion/${encodeURIComponent(data.setId)}`} className="transition-colors hover:text-white">
            {data.set_name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-slate-200">{data.name}</span>
        </nav>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
          {/* Imagen */}
          <div className="mx-auto w-full max-w-xs lg:sticky lg:top-8">
            <div className="relative aspect-[63/88] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_18px_44px_-12px_rgba(0,0,0,0.7)]">
              <Image
                src={data.image}
                alt={`Carta Pokémon ${data.name} ${data.number} de ${data.set_name}`}
                fill
                priority
                sizes="(min-width: 1024px) 340px, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Información */}
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {data.name}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              <Link href={setHref} className="font-medium text-slate-300 hover:text-rose-300">
                {data.set_name}
              </Link>
              {' '}
              <span className="text-slate-500">
                · {data.setId.toUpperCase()} #{data.number}
                {data.series ? ` · ${data.series}` : ''}
              </span>
            </p>

            {data.species && data.species.toLowerCase() !== data.name.toLowerCase() && (
              <Link
                href={`/especie/${encodeURIComponent(data.species.toLowerCase().replace(/ /g, '-'))}`}
                className="mt-2 inline-block text-xs font-semibold text-sky-400 transition-colors hover:text-sky-300"
              >
                Ver todas las cartas de {data.species} →
              </Link>
            )}

            {/* Datos del catálogo */}
            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.rarity && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">Rareza</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{data.rarity}</dd>
                </div>
              )}
              {data.supertype && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">Tipo</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{data.supertype}</dd>
                </div>
              )}
              {data.hp && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">PS</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">{data.hp}</dd>
                </div>
              )}
              {data.types.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">Energía</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {data.types.join(', ')}
                  </dd>
                </div>
              )}
              {data.subtypes.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">Categoría</dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {data.subtypes.join(', ')}
                  </dd>
                </div>
              )}
              {data.releaseDate && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-[10px] uppercase tracking-widest text-slate-500">
                    Fecha de lanzamiento
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-white">
                    {new Date(data.releaseDate).toLocaleDateString('es-AR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
              )}
            </dl>

            {/* Marketplace */}
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-5 py-4">
                <h2 className="text-base font-bold text-white">
                  {data.listingCount > 0
                    ? `${data.listingCount} publicación${data.listingCount !== 1 ? 'es' : ''} de ${data.name}`
                    : 'Sin publicaciones activas'}
                </h2>
                {data.minPrice != null && (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
                    desde {formatPrice(data.minPrice, data.currency)}
                  </span>
                )}
              </div>

              {data.listings.length > 0 ? (
                <ul className="divide-y divide-slate-800">
                  {data.listings.map((l) => (
                    <li key={l.binderCardId}>
                      <Link
                        href={`/card/${l.binderCardId}/${l.slug}`}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-800/40"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-binder-accent to-amber-500 text-xs font-bold text-white">
                          {(l.username?.[0] ?? 'C').toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {l.username ? `@${l.username}` : 'Coleccionista'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {[l.city, l.country].filter(Boolean).join(', ') || 'Ubicación no especificada'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            l.isForSale ? 'bg-emerald-500/15 text-emerald-400' : 'bg-sky-500/15 text-sky-400'
                          }`}
                        >
                          {l.isForSale && l.isForTrade
                            ? 'Venta y cambio'
                            : l.isForSale
                              ? 'En venta'
                              : 'Acepta cambios'}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-emerald-300">
                          {l.price != null ? formatPrice(l.price, l.currency) : 'Consultar'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400">
                    Todavía no hay publicaciones activas de {data.name}.
                  </p>
                  <Link
                    href="/binder"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-binder-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-500"
                  >
                    Publicar esta carta gratis
                  </Link>
                </div>
              )}
            </section>

            {/* Quiénes la tienen o la buscan (contenido dinámico por usuario) */}
            {(data.holderCount > 0 || data.wantlistCount > 0) && (
              <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
                <div className="border-b border-slate-800 px-5 py-3">
                  <h2 className="text-base font-bold text-white">Quiénes la tienen o la buscan</h2>
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      La tienen en su binder ({data.holderCount})
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {data.holders.map((h, i) =>
                        h.username ? (
                          <Link
                            key={h.username}
                            href={`/profile/${encodeURIComponent(h.username)}`}
                            className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                          >
                            @{h.username}
                          </Link>
                        ) : (
                          <span
                            key={`anon-${i}`}
                            className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-500"
                          >
                            Coleccionista
                          </span>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                      La buscan ({data.wantlistCount})
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {data.wantlistUsers.map((username) => (
                        <Link
                          key={username}
                          href={`/profile/${encodeURIComponent(username)}`}
                          className="rounded-full border border-sky-700/60 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300 transition-colors hover:border-sky-500 hover:text-sky-200"
                        >
                          @{username}
                        </Link>
                      ))}
                      {data.wantlistCount > data.wantlistUsers.length && (
                        <span className="px-2.5 py-1 text-xs text-slate-500">
                          +{data.wantlistCount - data.wantlistUsers.length} más
                        </span>
                      )}
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Guías de precios externas */}
            <section className="mt-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Consultar precio en otras guías
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {guideLinks.map((g) => (
                  <a
                    key={g.label}
                    href={g.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                  >
                    {g.label} ↗
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Recomendación cruzada: qué más venden/cambian los dueños de esta carta */}
        {data.companionCards.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-white">
              Usuarios que tienen esta carta en su binder también venden
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {data.companionCards.map((c) => (
                <Link
                  key={c.id}
                  href={`/carta/${encodeURIComponent(c.id)}/${c.slug}`}
                  className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-slate-600"
                >
                  <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
                    <Image
                      src={c.image}
                      alt={`Carta Pokémon ${c.name} ${c.number}`}
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
        )}

        {/* Otras impresiones de la misma especie */}
        {data.sameSpecies.length > 0 && (
          <RelatedSection title={`Otras cartas de ${data.species}`} cards={data.sameSpecies} />
        )}

        {/* Mismo set */}
        {data.sameSet.length > 0 && (
          <RelatedSection title={`Más cartas de ${data.set_name}`} cards={data.sameSet} />
        )}

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

function RelatedSection({
  title,
  cards
}: {
  title: string
  cards: Array<{
    id: string
    name: string
    number: string
    rarity: string | null
    image: string
    slug: string
  }>
}) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={`/carta/${encodeURIComponent(c.id)}/${c.slug}`}
            className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 transition-colors hover:border-slate-600"
          >
            <div className="relative aspect-[63/88] overflow-hidden bg-slate-950">
              <Image
                src={c.image}
                alt={`Carta Pokémon ${c.name} ${c.number}`}
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
  )
}