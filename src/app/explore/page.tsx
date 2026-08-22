import { redirect } from 'next/navigation'

// /explore ya no existe como página: la home (/) es el mercado completo.
// Se redirige de forma permanente para no romper links compartidos
// (notificaciones, ticker, claims) y mantener una única URL canónica.
export default function Page() {
  redirect('/')
}