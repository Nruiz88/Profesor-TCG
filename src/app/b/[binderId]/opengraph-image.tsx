import { ImageResponse } from '@vercel/og'
import { getBinderOgData } from '@/lib/og'
import BinderOgImage from '@/components/og/BinderOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Binder en Profesor TCG'

// Imagen de preview (WhatsApp/redes) de /b/[binderId], el link corto que se
// comparte desde el binder. Misma plantilla que /binder/[username].
export default async function Image({ params }: { params: Promise<{ binderId: string }> }) {
  const { binderId } = await params
  const data = await getBinderOgData({ binderId })
  return new ImageResponse(<BinderOgImage data={data} />, { ...size })
}
