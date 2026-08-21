import { ImageResponse } from '@vercel/og'
import { getCatalogCardPageData } from '@/lib/catalogPages'
import CatalogCardOgImage from '@/components/og/CatalogCardOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Carta en TCG Claim'

// Imagen de preview (WhatsApp/redes) de la ficha de catálogo (/carta/…):
// muestra la carta real, su set y el precio desde, en vez de la imagen
// genérica de la app.
export default async function Image({
  params
}: {
  params: Promise<{ cardId: string; slug: string[] }>
}) {
  const { cardId } = await params
  const data = await getCatalogCardPageData(cardId)
  return new ImageResponse(<CatalogCardOgImage data={data} />, { ...size })
}