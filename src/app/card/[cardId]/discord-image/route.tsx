import { ImageResponse } from '@vercel/og'
import { getCardOgData } from '@/lib/og'

// Imagen vertical (700 de alto, ancho proporcional a la carta 63:88) para el
// webhook de Discord. Muestra la carta grande centrada con nombre, set y precio.
const HEIGHT = 700
const WIDTH = Math.round((HEIGHT * 63) / 88) // ≈ 501

const fmt = (n: number | null, currency: string) =>
  n != null
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    : 'Consultar precio'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cardId: string }> }
): Promise<Response> {
  const { cardId } = await params
  const data = await getCardOgData(cardId)

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0f1e 0%, #151a33 55%, #241d4d 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif'
        }}
      >
        <p style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>TCG Claim</p>
        <p style={{ fontSize: 18, color: '#94a3b8', margin: '12px 0 0' }}>
          Tu colección en 3D · tu mercado en WhatsApp
        </p>
      </div>,
      { width: WIDTH, height: HEIGHT }
    )
  }

  const cardW = Math.round(WIDTH * 0.72)
  const cardH = Math.round((cardW * 88) / 63)

  return new ImageResponse(
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0b0f1e 0%, #151a33 55%, #241d4d 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        padding: '28px 20px'
      }}
    >
      {/* Carta grande */}
      <div style={{ display: 'flex', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.55)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.image}
          alt={data.name}
          width={cardW}
          height={cardH}
          style={{ borderRadius: 18, border: '3px solid rgba(255,255,255,0.12)' }}
        />
      </div>

      {/* Nombre + set */}
      <p style={{ fontSize: 30, fontWeight: 800, margin: '20px 0 0', textAlign: 'center', lineHeight: 1.1 }}>
        {data.name}
      </p>
      <p style={{ fontSize: 17, color: '#a5b4fc', margin: '6px 0 0', textAlign: 'center' }}>
        {data.set_name} · #{data.number}
      </p>

      {/* Precio */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 14,
          padding: '10px 26px',
          borderRadius: 14,
          background: data.isReserved ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
          border: `2px solid ${data.isReserved ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: 2,
            margin: 0,
            color: data.isReserved ? '#fbbf24' : '#34d399'
          }}
        >
          {data.isReserved ? 'RESERVADA · 24H' : 'EN TCG CLAIM'}
        </p>
        <p style={{ fontSize: 26, fontWeight: 800, margin: '4px 0 0' }}>
          {fmt(data.price, data.currency)}
        </p>
      </div>

      {/* Marca */}
      <p style={{ fontSize: 15, color: '#64748b', margin: 'auto 0 0', textAlign: 'center' }}>
        {data.username ? `por @${data.username}` : 'TCG Claim'} · Coordiná por WhatsApp
      </p>
    </div>,
    { width: WIDTH, height: HEIGHT }
  )
}
