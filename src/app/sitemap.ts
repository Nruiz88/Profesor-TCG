import type { MetadataRoute } from 'next'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Sitemap para Google: páginas estáticas + binders públicos. Los binders se
// generan con los usernames reales y se limitan para no explotar el tamaño.
// Sin NEXT_PUBLIC_APP_URL no se generan URLs absolutas (y se devuelve vacío).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  if (!base) return []

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/terminos`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidad`, changeFrequency: 'yearly', priority: 0.2 }
  ]

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceKey || !url) return entries

    const admin = createAdminClient(url, serviceKey)
    const { data: binders } = await admin
      .from('binders')
      .select('id, user_id')
      .eq('is_public', true)
      .limit(500)

    const userIds = [
      ...new Set((binders || []).map((b) => (b as { user_id: string }).user_id))
    ]
    const { data: profiles } = userIds.length
      ? await admin.from('profiles').select('id, username').in('id', userIds)
      : { data: [] }
    const usernameById = new Map(
      (profiles || []).map((p) => [(p as { id: string }).id, (p as { username: string }).username])
    )

    for (const b of binders || []) {
      const row = b as { user_id: string }
      const username = usernameById.get(row.user_id)
      if (username) {
        entries.push({
          url: `${base}/binder/${encodeURIComponent(username)}`,
          changeFrequency: 'daily',
          priority: 0.8
        })
      }
    }
  } catch {
    // sin binders no se rompe el sitemap
  }

  return entries
}
