import { createClient } from '@/lib/supabase/client'
import { generateUniqueSlug, listAllSlugs } from '@/lib/binderSlug'

/** Máximo de carpetas (binders) que puede tener un usuario. */
export const MAX_BINDERS = 12

// Obtener todos los binders del usuario activo
export async function getUserBinders(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('binders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Crear un nuevo binder con opciones (título, descripción, privacidad, portada, fondo)
export async function createBinder(
  userId: string,
  title: string,
  options?: {
    description?: string | null
    is_public?: boolean
    cover_card_id?: string | null
    background?: string | null
  }
) {
  const supabase = createClient()
  const slug = await generateUniqueSlug(() => listAllSlugs(supabase), title)

  // Límite de carpetas por usuario
  const { count } = await supabase
    .from('binders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if ((count ?? 0) >= MAX_BINDERS) {
    throw new Error(`Alcanzaste el máximo de ${MAX_BINDERS} carpetas.`)
  }

  const { data, error } = await supabase
    .from('binders')
    .insert({
      user_id: userId,
      title,
      description: options?.description ?? null,
      is_public: options?.is_public ?? false,
      cover_card_id: options?.cover_card_id ?? null,
      background: options?.background ?? null,
      slug
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Eliminar un binder y sus cartas en cascada
export async function deleteBinder(binderId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('binders')
    .delete()
    .eq('id', binderId)

  if (error) throw error
  return true
}