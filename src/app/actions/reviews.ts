'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isReviewTag } from '@/lib/reputation'
import { sanitizeComment } from '@/lib/sanitize'

// ============================================================================
// createReviewAction — cierra una transacción con reseña:
//   1. Inserta el registro en `reviews` (una por transacción y participante).
//   2. Marca el `claims` como 'completed'.
//   3. Recalcula rating_avg e incrementa total_sales / total_trades del
//      usuario calificado (sale si el claim era de venta, trade si era cambio).
// Todo se valida en el servidor: participación real, sin auto-calificación,
// rating 1-5 y tags permitidos.
//
// Seguridad: el comentario se sanitiza del lado del servidor con
// sanitizeComment (escape de <>"'& + máx 500) JUSTO ANTES del .insert(),
// garantizando que la base de datos almacene únicamente contenido neutralizado.
// ============================================================================

export interface CreateReviewInput {
  claimId: string
  reviewedUserId: string
  rating: number
  tags?: string[]
  comment?: string
}

export type CreateReviewResult = { ok: true } | { ok: false; error: string }

export async function createReviewAction(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) return { ok: false, error: 'Necesitás iniciar sesión' }

  const rating = Math.round(Number(input.rating))
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Calificación inválida (1 a 5 estrellas)' }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !url) return { ok: false, error: 'Servicio no disponible' }
  const admin = createAdminClient(url, serviceKey)

  try {
    // 1) La transacción existe y el usuario participó
    const { data: claim, error: claimError } = await admin
      .from('claims')
      .select('id, buyer_id, seller_id, card_id, kind, status')
      .eq('id', input.claimId)
      .maybeSingle()
    if (claimError) throw claimError
    if (!claim) return { ok: false, error: 'Transacción no encontrada' }
    if (claim.buyer_id !== user.id && claim.seller_id !== user.id) {
      return { ok: false, error: 'No participaste en esta transacción' }
    }
    if (claim.status === 'completed') {
      return { ok: false, error: 'Esta transacción ya fue confirmada' }
    }

    // 2) Se califica a la contraparte (nunca a uno mismo)
    const reviewedUserId = input.reviewedUserId
    if (reviewedUserId === user.id) {
      return { ok: false, error: 'No podés calificarte a vos mismo' }
    }
    const otherId = claim.buyer_id === user.id ? claim.seller_id : claim.buyer_id
    if (reviewedUserId !== otherId) {
      return { ok: false, error: 'Solo podés calificar a la otra parte de la transacción' }
    }

    const tags = (Array.isArray(input.tags) ? input.tags : [])
      .filter((t): t is string => typeof t === 'string' && isReviewTag(t))
      .slice(0, 6)
    const comment =
      typeof input.comment === 'string' && input.comment.trim() !== ''
        ? sanitizeComment(input.comment)
        : null

    // Conteo previo de reseñas del usuario calificado (para el promedio)
    const { count: prevCount } = await admin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewed_user_id', reviewedUserId)

    // 3) Insertar la reseña (unique claim+reviewer impide duplicados)
    const { data: review, error: insertError } = await admin
      .from('reviews')
      .insert({
        claim_id: claim.id,
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        rating,
        tags,
        comment
      })
      .select('id')
      .single()
    if (insertError) {
      if (insertError.code === '23505') {
        return { ok: false, error: 'Ya calificaste esta transacción' }
      }
      throw insertError
    }

    // 4) Cerrar la transacción
    await admin
      .from('claims')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', claim.id)

    // 5) Recalcular promedio + contador de transacciones del calificado
    const { data: reviewedProfile } = await admin
      .from('profiles')
      .select('rating_avg, total_sales, total_trades')
      .eq('id', reviewedUserId)
      .maybeSingle()

    if (reviewedProfile) {
      const before = prevCount ?? 0
      const oldAvg = Number(reviewedProfile.rating_avg ?? 5)
      const newAvg = Math.round(((oldAvg * before + rating) / (before + 1)) * 100) / 100
      // El claim de venta suma a total_sales; el de cambio a total_trades
      const isSale = claim.kind === 'sale'
      await admin
        .from('profiles')
        .update({
          rating_avg: newAvg,
          total_sales: isSale ? (reviewedProfile.total_sales ?? 0) + 1 : reviewedProfile.total_sales ?? 0,
          total_trades: isSale ? reviewedProfile.total_trades ?? 0 : (reviewedProfile.total_trades ?? 0) + 1
        })
        .eq('id', reviewedUserId)
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { ok: false, error: message }
  }
}
