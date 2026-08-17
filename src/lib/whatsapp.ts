// ============================================================================
// Generator de enlaces y mensajes preformateados para WhatsApp (Claim/Swap).
// Fuente canónica del deep link wa.me y de los textos del circuito de compra.
//
// lib/claim.ts re-exporta estas funciones para mantener compatibilidad con los
// imports existentes (`@/lib/claim`).
// ============================================================================

import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'
import { formatPrice } from '@/lib/priceGuide'
import type { ClaimParams } from '@/types/claim'

export type { ClaimParams }

const fmtPrice = (n: number | null, currency?: string | null) =>
  n != null ? formatPrice(n, currency) : 'consultar precio'

// Mensaje del comprador → vendedor (se abre en WhatsApp tras el CLAIM).
// Placeholders: {CARD_NAME} {SET_NUMBER} {PRICE} {CONDITION} {BINDER_SLOT_URL}
export function claimMessage(p: ClaimParams): string {
  const seller = p.sellerName ? `@${p.sellerName}` : 'coleccionista'
  const cond = p.condition ? ` (Estado: ${p.condition})` : ''
  const lang = p.language
    ? ` (Idioma: ${CARD_LANGUAGE_META[normalizeLanguage(p.language)].label})`
    : ''
  return [
    `¡Hola ${seller}! Vengo de tu Binder en Profesor TCG.`,
    `Hice el CLAIM de la carta *${p.cardName}* (#${p.setId.toUpperCase()} ${p.number})${cond}${lang} por ${fmtPrice(p.price, p.currency)}.`,
    '¿Cómo coordinamos el pago y el envío? 🚀'
  ].join('\n')
}

// Texto estructurado del Kit de Claim: listo para pegar en un grupo de WhatsApp.
// Incluye nombre, set/número, precio, condición y el link único al slot.
export function sellerKitText(p: ClaimParams): string {
  const lines = [
    '📦 *EN VENTA* · Profesor TCG',
    '━━━━━━━━━━━━━━━━━━━━'
  ]
  lines.push(`🃏 *${p.cardName}*`)
  lines.push(`📚 Set ${p.setId.toUpperCase()} · #${p.number}`)
  if (p.language)
    lines.push(
      `🌐 Idioma: ${CARD_LANGUAGE_META[normalizeLanguage(p.language)].label}`
    )
  lines.push(`🏷️ Precio: 💵 *${fmtPrice(p.price, p.currency)}*`)
  if (p.condition) lines.push(`✨ Estado: ${p.condition}`)
  lines.push('')
  lines.push(`🔗 Mirala en mi Binder 3D: ${p.binderSlotUrl}`)
  lines.push('')
  lines.push('⚡ *Primer claim por WhatsApp se la lleva.* ¡Hacé tu claim!')
  return lines.join('\n')
}

// Deep link de WhatsApp con el mensaje ya encodificado
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}