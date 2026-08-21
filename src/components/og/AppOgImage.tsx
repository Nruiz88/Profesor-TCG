interface AppOgImageProps {
  /** URL data: del logo (base64) ya cargado; si falta, se usa wordmark de texto. */
  logo: string | null
}

// Imagen Open Graph genérica (1200x630) de la app: logo + marca + tagline.
// La usa la home y todas las páginas sin imagen propia (explore, buscados,
// terminos, privacidad, binder propio, cartas del catálogo, etc.).
export default function AppOgImage({ logo }: AppOgImageProps) {
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
      {/* Logo / wordmark */}
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
            width: 340,
            height: 340,
            borderRadius: 56,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.55)'
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt="TCG Claim"
              width={260}
              height={260}
              style={{ borderRadius: 24 }}
            />
          ) : (
            <p style={{ fontSize: 84, fontWeight: 800, margin: 0 }}>TCG</p>
          )}
        </div>
      </div>

      {/* Marca */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          paddingRight: 72
        }}
      >
        <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: '#fb7185', margin: 0 }}>
          PROFESOR TCG
        </p>
        <p style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, margin: '14px 0 0' }}>
          TCG Claim
        </p>
        <p style={{ fontSize: 30, color: '#a5b4fc', margin: '16px 0 0' }}>
          Tu colección en 3D · tu mercado en WhatsApp
        </p>

        <p style={{ fontSize: 22, color: '#64748b', margin: '40px 0 0' }}>
          Vende · Cambia · Coordiná directo por WhatsApp
        </p>
      </div>
    </div>
  )
}