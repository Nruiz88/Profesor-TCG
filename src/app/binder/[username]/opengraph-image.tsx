import { ImageResponse } from '@vercel/og'
import { getBinderOgData } from '@/lib/og'
import BinderOgImage from '@/components/og/BinderOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Binder en Profesor TCG'

// Imagen de preview (WhatsApp/redes) de /binder/[username]: portada del
// binder, título, dueño y estadísticas. Generada al vuelo con @vercel/og.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const data = await getBinderOgData({ username })
  return new ImageResponse(<BinderOgImage data={data} />, { ...size })
}
