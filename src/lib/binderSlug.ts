// ============================================================================
// Slugs de binders: URLs públicas cortas /b/<slug>
// ============================================================================
// El slug se deriva del título del binder (slugify). `ensureBinderSlug`
// garantiza que un binder tenga slug: si no lo tiene, lo genera evitando
// colisiones y lo persiste. Funciona con cualquier cliente de Supabase
// (server o browser) porque la lectura de binders propios está permitida por
// RLS.
//
// Los slugs son únicos en TODA la plataforma (no solo por usuario): la
// resolución de /b/<slug> es global, así que dos coleccionistas con el mismo
// título (p.ej. "Mi Colección") colisionarían y el link caería en 404.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'

interface SlugRow {
  id: string
  slug: string | null
}

// Genera un slug único global. base = slugify(título). Si existe
// "mi-coleccion", prueba "mi-coleccion-2", "mi-coleccion-3", etc.
// excludeBinderId excluye el propio binder al renombrarlo (su slug actual no
// debe contar como colisión de sí mismo).
export async function generateUniqueSlug(
  getRows: () => Promise<SlugRow[]>,
  title: string,
  excludeBinderId?: string
): Promise<string> {
  const base = slugify(title) || 'binder'
  const rows = await getRows()
  const taken = rows
    .filter((r) => r.id !== excludeBinderId)
    .map((r) => r.slug)
    .filter((s): s is string => !!s)

  if (!taken.includes(base)) return base
  let i = 2
  while (taken.includes(`${base}-${i}`)) i++
  return `${base}-${i}`
}

// Lee los slugs de todos los binders de la plataforma (para resolver
// colisiones globales de /b/<slug>).
export async function listAllSlugs(supabase: SupabaseClient): Promise<SlugRow[]> {
  const { data } = await supabase
    .from('binders')
    .select('id, slug')
    .not('slug', 'is', null)
  return (data ?? []) as SlugRow[]
}

// Garantiza que el binder tenga slug y lo devuelve. Si no tenía, lo genera y
// lo persiste. Si el título cambió y el slug quedó desactualizado, se puede
// forzar con forceRegenerate (p.ej. al renombrar).
export async function ensureBinderSlug(
  supabase: SupabaseClient,
  binder: { id: string; user_id: string; title: string; slug?: string | null },
  opts?: { forceRegenerate?: boolean }
): Promise<string> {
  const force = !!opts?.forceRegenerate
  if (binder.slug && !force) return binder.slug

  const slug = await generateUniqueSlug(
    () => listAllSlugs(supabase),
    binder.title,
    binder.id
  )
  await supabase.from('binders').update({ slug }).eq('id', binder.id)
  return slug
}
