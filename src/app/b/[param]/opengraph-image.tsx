import { ImageResponse } from '@vercel/og'
import { getBinderOgData } from '@/lib/og'
import BinderOgImage from '@/components/og/BinderOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Binder en Profesor TCG'

// Imagen de preview (WhatsApp/redes) de /b/<param> (slug o binderId): portada
// del binder, título, dueño y estadísticas. Generada al vuelo con @vercel/og.
export default async function Image({ params }: { params: Promise<{ param: string }> }) {
  const { param } = await params
  const data = await getBinderOgData({ binderKey: param })
  return new ImageResponse(<BinderOgImage data={data} />, { ...size })
}
