/** @type {import('next').NextConfig} */
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
  }
}

export default nextConfig