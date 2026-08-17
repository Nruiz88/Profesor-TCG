// ============================================================================
// Generator de enlaces y mensajes preformateados para WhatsApp (Claim/Swap).
// Fuente canónica del deep link wa.me y de los textos del circuito de compra.
//
// lib/claim.ts re-exporta estas funciones para mantener compatibilidad con los
// imports existentes (`@/lib/claim`).
//
// Módulo de sanitización: TODO texto que entra al mensaje pasa por
// sanitizeWhatsAppText() (quita HTML, scripts y caracteres de control) y el
// número de teléfono por sanitizeWhatsAppPhone() (solo dígitos), de modo que
// los deep links no puedan romper la URL ni inyectar código.
// ============================================================================

import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'
import { formatPrice } from '@/lib/priceGuide'
import type { ClaimParams } from '@/types/claim'

export type { ClaimParams }

const fmtPrice = (n: number | null, currency?: string | null) =>
  n != null ? formatPrice(n, currency) : 'consultar precio'

// ---------------------------------------------------------------------------
// Idiomas soportados en el mensaje (código ISO de la app; 'KR' es Coreano)
// ---------------------------------------------------------------------------

export type WhatsAppLanguage = 'ES' | 'EN' | 'JP' | 'KR' | 'ZH'

const WHATSAPP_LANGUAGE_LABEL: Record<WhatsAppLanguage, string> = {
  ES: 'Español',
  EN: 'Inglés',
  JP: 'Japonés',
  KR: 'Coreano',
  ZH: 'Chino'
}

// Normaliza cualquier valor a un idioma válido del mensaje. Acepta también
// 'KO' (el código que usa la tabla binder_cards) y lo mapea a 'KR'.
export function normalizeWhatsAppLanguage(value: unknown): WhatsAppLanguage {
  if (value === 'KO' || value === 'KR') return 'KR'
  return typeof value === 'string' && value in WHATSAPP_LANGUAGE_LABEL
    ? (value as WhatsAppLanguage)
    : 'ES'
}

// ---------------------------------------------------------------------------
// Sanitización de entradas
// ---------------------------------------------------------------------------

// Limpia texto libre antes de embebirlo en el mensaje: elimina bloques de
// scripts, etiquetas HTML, caracteres de control y colapsa espacios. Previene
// mensajes con markup roto o payloads tipo XSS dentro del deep link.
export function sanitizeWhatsAppText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Deja el número listo para el deep link: elimina espacios, guiones, el '+'
// internacional y cualquier otro carácter no numérico (solo dígitos).
export function sanitizeWhatsAppPhone(value: unknown): string {
  return String(value ?? '')
    .replace(/[\s\-+]/g, '')
    .replace(/\D/g, '')
}

// ---------------------------------------------------------------------------
// Mensaje formateado (Claim / Swap)
// ---------------------------------------------------------------------------

/**
 * Parámetros para armar el mensaje y el deep link de WhatsApp de la transacción.
 * El mensaje se genera siempre desde datos sanitizados (ver formatWhatsAppMessage).
 */
export interface WhatsAppMessageParams {
  /** Número de WhatsApp del vendedor (con o sin código de país / '+' / espacios). */
  sellerPhone: string
  /** Username del vendedor en Profesor TCG (se antepone '@' en el saludo). */
  sellerUsername: string
  /** Nombre de la carta que se quiere reclamar/intercambiar. */
  cardName: string
  /** Nombre o código de la expansión de la carta. */
  setName: string
  /** Número dentro de la expansión (#25, 143/172…). */
  cardNumber?: string
  /** Idioma de la copia física (ISO de la app; se acepta también 'KO'). */
  language: WhatsAppLanguage
  /** Condición física de la carta (Mint, Near Mint…). */
  condition?: string
  /** Tipo de transacción: compra (claim) o intercambio (swap). */
  type: 'claim' | 'swap'
  /** Precio de la carta (solo aplica a compras). */
  price?: number
  /** Moneda del precio (USD/EUR/ARS). */
  currency?: string
  /** Carta que ofrece el comprador (solo aplica a swaps). */
  offeredCardName?: string
  /** URL pública del slot en el binder. */
  slotUrl?: string
}

// Mensaje del comprador → vendedor con Markdown nativo de WhatsApp:
// *negrita* para lo importante, _cursiva_ para la carta ofrecida en un swap.
export function formatWhatsAppMessage(params: WhatsAppMessageParams): string {
  const seller = sanitizeWhatsAppText(params.sellerUsername)
  const cardName = sanitizeWhatsAppText(params.cardName)
  const setName = sanitizeWhatsAppText(params.setName)
  const cardNumber = sanitizeWhatsAppText(params.cardNumber)
  const condition = sanitizeWhatsAppText(params.condition)
  const offeredCardName = sanitizeWhatsAppText(params.offeredCardName)
  const slotUrl = sanitizeWhatsAppText(params.slotUrl)
  const languageLabel = WHATSAPP_LANGUAGE_LABEL[normalizeWhatsAppLanguage(params.language)]

  const greeting = `¡Hola @${seller || 'coleccionista'}! Vengo de tu Binder en Profesor TCG.`

  const cardLine = `🃏 *${cardName}*`
  const setLine = `📚 Set: ${setName}${cardNumber ? ` · #${cardNumber}` : ''}`
  const langLine = `🌐 Idioma: ${languageLabel}`
  const condLine = condition ? `✨ Estado: ${condition}` : ''
  const priceDisplay =
    params.price != null ? formatPrice(params.price, params.currency) : ''
  const priceLine = priceDisplay ? `🏷️ Precio: *${priceDisplay}*` : ''
  const slotLine = slotUrl ? `🔗 ${slotUrl}` : ''

  if (params.type === 'swap') {
    const swapLine = offeredCardName
      ? `Quiero hacer un intercambio: mi _${offeredCardName}_ por tu *${cardName}*.`
      : `Quiero hacer un intercambio por tu *${cardName}*.`
    const lines = [
      greeting,
      swapLine,
      cardLine,
      setLine,
      langLine,
      condLine,
      slotLine,
      '',
      '¿Qué te parece el intercambio? 🚀'
    ]
    return lines.filter((l) => l !== '').join('\n')
  }

  const claimLine = priceDisplay
    ? `Quiero reclamar la carta *${cardName}* por *${priceDisplay}*.`
    : `Quiero reclamar la carta *${cardName}*.`
  const lines = [
    greeting,
    claimLine,
    cardLine,
    setLine,
    langLine,
    condLine,
    slotLine,
    '',
    '¿Cómo coordinamos el pago y el envío? 🚀'
  ]
  return lines.filter((l) => l !== '').join('\n')
}

// ---------------------------------------------------------------------------
// Deep link de WhatsApp (móvil y escritorio)
// ---------------------------------------------------------------------------

// Genera el deep link de la transacción con el mensaje ya encodificado.
// isMobile=true usa el esquema nativo 'whatsapp://send' (abre la app);
// isMobile=false usa 'https://api.whatsapp.com/send' (funciona en escritorio).
// El número se limpia (solo dígitos) y el texto se codifica con
// encodeURIComponent() para evitar URLs rotas o inyecciones de código.
export function generateWhatsAppUrl(
  params: WhatsAppMessageParams,
  isMobile: boolean = false
): string {
  const phone = sanitizeWhatsAppPhone(params.sellerPhone)
  const message = formatWhatsAppMessage(params)
  const base = isMobile ? 'whatsapp://send' : 'https://api.whatsapp.com/send'
  return `${base}?phone=${phone}&text=${encodeURIComponent(message)}`
}

// Deep link de WhatsApp con el mensaje ya encodificado
export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}

// Mensaje del comprador → vendedor (se abre en WhatsApp tras el CLAIM).
// Incluye el link a la publicación de la carta para que el preview muestre
// la carta (con su og:image) y el vendedor pueda ubicarla al toque.
export function claimMessage(p: ClaimParams): string {
  const seller = p.sellerName ? `@${p.sellerName}` : 'coleccionista'
  const cond = p.condition ? ` (Estado: ${p.condition})` : ''
  const lang = p.language
    ? ` (Idioma: ${CARD_LANGUAGE_META[normalizeLanguage(p.language)].label})`
    : ''
  return [
    `¡Hola ${seller}! Vengo de tu Binder en Profesor TCG.`,
    `Hice el CLAIM de la carta *${p.cardName}* (#${p.setId.toUpperCase()} ${p.number})${cond}${lang} por ${fmtPrice(p.price, p.currency)}.`,
    `🔗 Publicación de la carta: ${p.cardUrl}`,
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
  lines.push(`🔗 Publicación de la carta: ${p.cardUrl}`)
  lines.push('')
  lines.push('⚡ *Primer claim por WhatsApp se la lleva.* ¡Hacé tu claim!')
  return lines.join('\n')
}