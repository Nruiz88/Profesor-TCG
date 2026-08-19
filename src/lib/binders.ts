import { createClient } from '@/lib/supabase/client'
import { generateUniqueSlug, listUserSlugs } from '@/lib/binderSlug'

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

// Crear un nuevo binder con opciones (título, descripción, privacidad, portada)
export async function createBinder(
  userId: string,
  title: string,
  options?: {
    description?: string | null
    is_public?: boolean
    cover_card_id?: string | null
  }
) {
  const supabase = createClient()
  const slug = await generateUniqueSlug(
    (uid) => listUserSlugs(supabase, uid),
    userId,
    title
  )
  const { data, error } = await supabase
    .from('binders')
    .insert({
      user_id: userId,
      title,
      description: options?.description ?? null,
      is_public: options?.is_public ?? false,
      cover_card_id: options?.cover_card_id ?? null,
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