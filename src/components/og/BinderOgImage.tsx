import type { OgBinderData } from '@/lib/og'

const CARD_W = 300
const CARD_H = Math.round((CARD_W * 88) / 63)

const fmt = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Imagen Open Graph (1200x630) de un binder público: portada en la izquierda
// (carta real con la proporción 63:88) y a la derecha el título, el dueño y
// las estadísticas. Se renderiza con @vercel/og (Satori): solo CSS inline.
export default function BinderOgImage({ data }: { data: OgBinderData | null }) {
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
      {/* Carta de portada */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 520 }}>
        <div
          style={{
            display: 'flex',
            borderRadius: 22,
            transform: 'rotate(-4deg)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.55)'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.coverImage ?? ''}
            alt={data.coverCardName ?? ''}
            width={CARD_W}
            height={CARD_H}
            style={{ borderRadius: 22, border: '4px solid rgba(255,255,255,0.12)' }}
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
        <p style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.15, margin: '14px 0 0' }}>
          {data.title}
        </p>
        <p style={{ fontSize: 28, color: '#a5b4fc', margin: '10px 0 0' }}>
          {data.username ? `@${data.username}` : 'Coleccionista'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', margin: '34px 0 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 44 }}>
            <p style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>{data.cardCount}</p>
            <p style={{ fontSize: 18, color: '#94a3b8', margin: '4px 0 0' }}>
              carta{data.cardCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ width: 2, height: 64, background: 'rgba(148,163,184,0.25)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 44 }}>
            <p style={{ fontSize: 40, fontWeight: 800, color: '#fbbf24', margin: 0 }}>
              {fmt(data.totalValue)}
            </p>
            <p style={{ fontSize: 18, color: '#94a3b8', margin: '4px 0 0' }}>valor total</p>
          </div>
        </div>

        <p style={{ fontSize: 20, color: '#64748b', margin: '36px 0 0' }}>
          Vende · Cambia · Coordiná directo por WhatsApp
        </p>
      </div>
    </div>
  )
}
