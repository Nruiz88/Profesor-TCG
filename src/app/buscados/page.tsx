import { redirect } from 'next/navigation'

// /buscados ya no existe como página: la home (/) concentra mercado y
// buscadas en solapas. Se redirige de forma permanente.
export default function Page() {
  redirect('/')
}