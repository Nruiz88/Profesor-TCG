import { ImageResponse } from '@vercel/og'
import { getBinderOgData } from '@/lib/og'
import BinderOgImage from '@/components/og/BinderOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Binder en Profesor TCG'

// Imagen de preview (WhatsApp/redes) de /binder/[username]: portada del
// binder, título, dueño y estadísticas. Generada al vuelo con @vercel/og.
// Respeta ?binderId=<id> para generar la miniatura del binder correcto.
export default async function Image({
  params,
  searchParams
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ binderId?: string }>
}) {
  const { username } = await params
  const { binderId } = await searchParams
  const data = await getBinderOgData(binderId ? { binderId } : { username })
  return new ImageResponse(<BinderOgImage data={data} />, { ...size })
}
