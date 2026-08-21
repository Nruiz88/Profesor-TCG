import type { Metadata } from 'next'
import BinderPage from './BinderPage'

export const metadata: Metadata = {
  title: 'Mi Binder virtual de cartas TCG',
  description:
    'Organizá tu colección en un binder virtual de 9 bolsillos, con precios de mercado en vivo y publicación directa en el marketplace.',
  alternates: { canonical: '/binder' },
  openGraph: { url: '/binder' }
}

export default function Page() {
  return <BinderPage />
}