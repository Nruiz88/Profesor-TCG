import { redirect, notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// URL corta de carta: /c/<short> → redirige a la URL canónica
// /card/<uuid>/<slug>. <short> es un prefijo del UUID (8 chars hex, ver
// shortCardId en lib/utils). Se resuelve por prefijo con service role porque
// una carta publicada individualmente (venta/cambio) puede vivir en un binder
// privado y su RLS la ocultaría a visitantes anónimos.
export default async function Page({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url || !/^[0-9a-f]{6,}$/i.test(shortId)) {
    notFound()
  }
  const admin = createAdminClient(url, serviceKey)

  const { data } = await admin
    .from('binder_cards')
    .select('id, card_name, is_for_sale, is_for_trade')
    .like('id', `${shortId.toLowerCase()}%`)
    .limit(1)

  const card = Array.isArray(data) ? data[0] : undefined
  if (!card || (!card.is_for_sale && !card.is_for_trade)) {
    notFound()
  }

  redirect(`/card/${card.id}/${slugify(card.card_name)}`)
}
