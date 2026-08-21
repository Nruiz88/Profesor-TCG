import type { Metadata } from 'next'
import LoginPage from './LoginPage'

export const metadata: Metadata = {
  title: 'Ingresar | TCG Claim',
  robots: { index: false, follow: false }
}

export default function Page() {
  return <LoginPage />
}