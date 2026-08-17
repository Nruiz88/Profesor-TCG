import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/services/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        binder: {
          bg: '#0a0c10',
          sheet: '#111418',
          pocket: '#161a20',
          pocketEdge: '#1f242c',
          accent: '#f43f5e'
        }
      }
    }
  },
  plugins: []
}

export default config