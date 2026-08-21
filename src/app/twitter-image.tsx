import { ImageResponse } from '@vercel/og'
import AppOgImage from '@/components/og/AppOgImage'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'TCG Claim — Mercado P2P de Cartas TCG'

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')

async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(`${APP_URL}/brand/logo-invertido.png`)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`
  } catch {
    return null
  }
}

// Twitter card image: misma imagen que el OG de la app.
export default async function Image() {
  const logo = await loadLogo()
  return new ImageResponse(<AppOgImage logo={logo} />, { ...size })
}