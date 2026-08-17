import { ImageResponse } from '@vercel/og'
import { getCardOgData } from '@/lib/og'
import CardOgImage from '@/components/og/CardOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Carta en Profesor TCG'

// Imagen de preview (WhatsApp/redes) de una carta publicada: carta real,
// nombre, set y precio. Es la imagen que referencia el kit de claim y el
// mensaje de CLAIM (cardPublicUrl), para que el preview muestre la carta y no
// la portada del binder.
export default async function Image({
  params
}: {
  params: Promise<{ cardId: string }>
}) {
  const { cardId } = await params
  const data = await getCardOgData(cardId)
  return new ImageResponse(<CardOgImage data={data} />, { ...size })
}
