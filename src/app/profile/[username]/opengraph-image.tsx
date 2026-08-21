import { ImageResponse } from '@vercel/og'
import { getProfileOgData } from '@/lib/og'
import ProfileOgImage from '@/components/og/ProfileOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Perfil en TCG Claim'

// Imagen de preview (WhatsApp/redes) de /profile/[username]: avatar,
// reputación, transacciones y colección. Generada al vuelo con @vercel/og.
export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const data = await getProfileOgData(username)
  const res = new ImageResponse(<ProfileOgImage data={data} />, { ...size })
  res.headers.set(
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
  )
  return res
}
