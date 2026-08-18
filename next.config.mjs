/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://storage.ko-fi.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.pokemontcg.io https://images.scrydex.com https://assets.tcgdex.net https://raw.githubusercontent.com https://*.supabase.co https://storage.ko-fi.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src 'self' https://js.stripe.com https://www.youtube.com",
      "object-src 'none'",
      'base-uri "self"',
      'form-action "self"',
      'upgrade-insecure-requests'
    ].join('; ')
  }
]

const nextConfig = {
  // Compresión HTTP de respuestas (gzip/brotli) para reducir el peso en móviles.
  compress: true,
  // Incluye los datos estáticos del catálogo (src/content) en las serverless
  // functions de Vercel: las lecturas dinámicas de FS no son trazables por
  // @vercel/nft, así que sin esto los JSON podrían faltar en producción.
  outputFileTracingIncludes: {
    '/**/*': ['./src/content/en/**', './src/content/ja/**']
  },
  images: {
    // Conversión automática de imágenes a formatos de última generación.
    // Next.js usa `sharp` (instalado vía overrides) como motor de
    // optimización cuando está presente en node_modules.
    formats: ['image/avif', 'image/webp'],
    // Dominios de CDNs externas permitidos para next/image sin errores de CORS.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.tcgdex.net'
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io'
      },
      {
        // Supabase Storage: <project-ref>.supabase.co
        protocol: 'https',
        hostname: '*.supabase.co'
      }
    ]
  },
  // Security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders
    }
  ]
}

export default nextConfig
