import type { Metadata } from 'next'
import ClaimsPage from './ClaimsPage'

export const metadata: Metadata = {
  title: 'Mis transacciones | TCG Claim',
  robots: { index: false, follow: false }
}

export default function Page() {
  return <ClaimsPage />
}