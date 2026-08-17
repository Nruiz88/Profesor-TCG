'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeLanguage, isCardLanguage, type CardLanguage } from '@/lib/cardLanguage'
import { sanitizeCardTitle, sanitizePlainText } from '@/lib/sanitize'

// ============================================================================
// createCustomCardAction — agrega una carta NO catalogada (Custom Card) al
// binder del usuario autenticado.
//
// Seguridad:
//   - Solo un usuario logueado puede invocarla (Server Action + RLS).
//   - El binder destino se valida contra el dueño (auth.uid() = user_id).
//   - Toda entrada se sanitiza del lado del servidor JUSTO ANTES del .insert():
//       * cardName  → sanitizeCardTitle  (chars TCG + máx 80)
//       * setId/nº  → sanitizePlainText  (sin tags/scripts/controles)
//   - slot_number se calcula en servidor (evita colisiones y valores
//     arbitrarios del cliente).
// ============================================================================

export interface CreateCustomCardInput {
  binderId: string
  cardName: string
  setId: string
  number: string
  language?: CardLanguage
}

export type CreateCustomCardResult =
  | { success: true; cardId: string; slotNumber: number }
  | { success: false; error: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function createCustomCardAction(
  input: CreateCustomCardInput
): Promise<CreateCustomCardResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) return { success: false, error: 'No autorizado' }

  const binderId = typeof input.binderId === 'string' ? input.binderId.trim() : ''
  if (!UUID_RE.test(binderId)) {
    return { success: false, error: 'Identificador de binder inválido' }
  }

  // Sanitización SERVIDOR justo antes de tocar la base de datos.
  const cardName = sanitizeCardTitle(input.cardName)
  const setId = sanitizePlainText(input.setId)
  const number = sanitizePlainText(input.number)
  const language = isCardLanguage(input.language)
    ? input.language
    : normalizeLanguage(input.language)

  if (!cardName) return { success: false, error: 'El nombre de la carta es obligatorio' }
  if (!setId) return { success: false, error: 'La expansión es obligatoria' }
  if (!number) return { success: false, error: 'El número de la carta es obligatorio' }

  try {
    // El binder debe pertenecer al usuario (RLS no permite lo contrario).
    const { data: binder } = await supabase
      .from('binders')
      .select('id')
      .eq('id', binderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!binder) {
      return { success: false, error: 'Binder no encontrado' }
    }

    // Siguiente slot libre del binder, calculado en servidor.
    const { data: last } = await supabase
      .from('binder_cards')
      .select('slot_number')
      .eq('binder_id', binder.id)
      .order('slot_number', { ascending: false })
      .limit(1)
    const slotNumber = (last?.[0]?.slot_number ?? 0) + 1

    // card_id único para la custom (fuera del catálogo): el prefijo custom-
    // permite distinguirla de las cartas oficiales en el render.
    const cardId = `custom-${crypto.randomUUID()}`

    const { data: card, error } = await supabase
      .from('binder_cards')
      .insert({
        binder_id: binder.id,
        card_id: cardId,
        card_name: cardName,
        set_id: setId,
        number,
        slot_number: slotNumber,
        language,
        is_user_reported: true,
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()
    if (error) throw error

    return { success: true, cardId: card.id, slotNumber }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { success: false, error: message }
  }
}