import type { OgCardData } from '@/lib/og'

const CARD_W = 330
const CARD_H = Math.round((CARD_W * 88) / 63)

const fmt = (n: number | null, currency: string) =>
  n != null
    ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    : 'Consultar precio'

// Imagen Open Graph (1200x630) de una carta publicada: la carta real a la
// izquierda y a la derecha nombre, set y precio con la marca. Se renderiza con
// @vercel/og (Satori): solo CSS inline.
export default function CardOgImage({ data }: { data: OgCardData | null }) {
  if (!data) {
    return (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b0f1e 0%, #151a33 55%, #241d4d 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif'
        }}
      >
        <p style={{ fontSize: 64, fontWeight: 800, margin: 0 }}>Profesor TCG</p>
        <p style={{ fontSize: 26, color: '#94a3b8', margin: '18px 0 0' }}>
          Tu colección en 3D · tu mercado en WhatsApp
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        background: 'linear-gradient(135deg, #0b0f1e 0%, #151a33 55%, #241d4d 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}
    >
      {/* Carta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 560 }}>
        <div
          style={{
            display: 'flex',
            borderRadius: 24,
            transform: 'rotate(-3deg)',
            boxShadow: '0 30px 70px rgba(0,0,0,0.6)'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt={data.name}
            width={CARD_W}
            height={CARD_H}
            style={{ borderRadius: 24, border: '4px solid rgba(255,255,255,0.12)' }}
          />
        </div>
      </div>

      {/* Información */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 72px 0 8px'
        }}
      >
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: '#fb7185', margin: 0 }}>
          PROFESOR TCG
        </p>
        <p style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.12, margin: '14px 0 0' }}>
          {data.name}
        </p>
        <p style={{ fontSize: 26, color: '#a5b4fc', margin: '10px 0 0' }}>
          {data.set_name} · #{data.number}
        </p>
        {data.username && (
          <p style={{ fontSize: 22, color: '#94a3b8', margin: '8px 0 0' }}>
            por @{data.username}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'flex-start',
            marginTop: 30,
            padding: '18px 30px',
            borderRadius: 18,
            background: data.isReserved ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
            border: `3px solid ${data.isReserved ? 'rgba(245,158,11,0.5)' : 'rgba(16,185,129,0.5)'}`
          }}
        >
          <p
            style={{
              fontSize: 16,
              letterSpacing: 3,
              margin: 0,
              color: data.isReserved ? '#fbbf24' : '#34d399'
            }}
          >
            {data.isReserved ? 'RESERVADA · 24H' : 'EN VENTA / CAMBIO'}
          </p>
          <p style={{ fontSize: 38, fontWeight: 800, margin: '6px 0 0', color: '#ffffff' }}>
            {fmt(data.price, data.currency)}
          </p>
        </div>

        <p style={{ fontSize: 20, color: '#64748b', margin: '32px 0 0' }}>
          ¿La tenés? Coordiná el trato directo por WhatsApp
        </p>
      </div>
    </div>
  )
}
