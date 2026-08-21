import type { Metadata } from 'next'
import OffersPage from './OffersPage'

export const metadata: Metadata = {
  title: 'Ofertas | TCG Claim',
  robots: { index: false, follow: false }
}

export default function Page() {
  return <OffersPage />
}