import type { OgProfileData } from '@/lib/og'

// Imagen Open Graph (1200x630) de un perfil público: avatar con la inicial,
// reputación (★), transacciones completadas, cartas en el binder y Pokédex.
// Se renderiza con @vercel/og (Satori): solo CSS inline.
export default function ProfileOgImage({ data }: { data: OgProfileData | null }) {
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

  const initial = (data.username[0] ?? 'C').toUpperCase()
  const location =
    data.city || data.country ? [data.city, data.country].filter(Boolean).join(', ') : null

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0b0f1e 0%, #151a33 55%, #241d4d 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif'
      }}
    >
      {/* Avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 480
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)',
            fontSize: 110,
            fontWeight: 800,
            color: '#ffffff',
            boxShadow: '0 30px 70px rgba(244,63,94,0.35)'
          }}
        >
          {initial}
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
          PROFESOR TCG · PERFIL
        </p>
        <p style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.15, margin: '12px 0 0' }}>
          @{data.username}
          {data.isVerified && (
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                color: '#34d399',
                marginLeft: 18,
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(52,211,153,0.12)',
                border: '2px solid rgba(52,211,153,0.4)'
              }}
            >
              VERIFICADO
            </span>
          )}
        </p>
        {location && (
          <p style={{ fontSize: 24, color: '#a5b4fc', margin: '8px 0 0' }}>{location}</p>
        )}

        {/* Reputación */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '28px 0 0',
            padding: '14px 24px',
            borderRadius: 16,
            background: 'rgba(251,191,36,0.10)',
            border: '2px solid rgba(251,191,36,0.35)',
            alignSelf: 'flex-start'
          }}
        >
          <p style={{ fontSize: 34, fontWeight: 800, color: '#fbbf24', margin: 0 }}>
            {data.ratingAvg != null ? `${data.ratingAvg.toFixed(1)} / 5` : 'Sin rating'}
          </p>
          <p style={{ fontSize: 20, color: '#94a3b8', margin: '0 0 0 14px' }}>
            {data.reviewCount} reseña{data.reviewCount !== 1 ? 's' : ''} · {data.completedClaims}{' '}
            transaccione{data.completedClaims !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Colección */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', marginRight: 32 }}>
            <p style={{ fontSize: 38, fontWeight: 800, margin: 0 }}>{data.totalCards}</p>
            <p style={{ fontSize: 17, color: '#94a3b8', margin: '4px 0 0' }}>cartas en el binder</p>
          </div>
          <div style={{ width: 2, height: 58, background: 'rgba(148,163,184,0.25)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', margin: '0 32px' }}>
            <p style={{ fontSize: 38, fontWeight: 800, color: '#f472b6', margin: 0 }}>
              {data.pokedexCaptured != null ? data.pokedexCaptured : '—'}
              {data.pokedexTotal != null ? `/${data.pokedexTotal}` : ''}
            </p>
            <p style={{ fontSize: 17, color: '#94a3b8', margin: '4px 0 0' }}>Pokémon capturados</p>
          </div>
          <div style={{ width: 2, height: 58, background: 'rgba(148,163,184,0.25)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 32 }}>
            <p style={{ fontSize: 38, fontWeight: 800, color: '#e879f9', margin: 0 }}>
              {data.wantlistCount}
            </p>
            <p style={{ fontSize: 17, color: '#94a3b8', margin: '4px 0 0' }}>
              carta{data.wantlistCount !== 1 ? 's' : ''} buscada{data.wantlistCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 20, color: '#64748b', margin: '32px 0 0' }}>
          {data.activeListings > 0
            ? `Coleccionista · ${data.activeListings} carta${data.activeListings !== 1 ? 's' : ''} en venta · mercado por WhatsApp`
            : 'Coleccionista de Profesor TCG · Binder y mercado por WhatsApp'}
        </p>
      </div>
    </div>
  )
}
