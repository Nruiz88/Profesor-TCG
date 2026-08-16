import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        binder: {
          bg: '#0f1115',
          sheet: '#1a1d24',
          pocket: '#232630',
          pocketEdge: '#2e323c',
          accent: '#f43f5e'
        }
      }
    }
  },
  plugins: []
}

export default config