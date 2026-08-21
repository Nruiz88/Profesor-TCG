import { ImageResponse } from '@vercel/og'
import AppOgImage from '@/components/og/AppOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'TCG Claim — Mercado P2P de Cartas TCG'

// Twitter card image: misma imagen que el OG de la app.
export default async function Image() {
  return new ImageResponse(<AppOgImage />, { ...size })
}