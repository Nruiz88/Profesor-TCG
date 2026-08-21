import { redirect } from 'next/navigation'

// La v2 ahora ES la home (/). /v2 redirige de forma permanente (308) para
// evitar contenido duplicado y mantener una única URL canónica indexable.
export default function Page() {
  redirect('/')
}