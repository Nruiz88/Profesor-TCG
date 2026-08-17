// ============================================================================
// Normalizador Único de Cartas (Service Adapter).
//
// normalizeCard() recibe cualquier objeto genérico de una API o de la DB
// (TCGdex, pokemon-tcg-data, filas de Supabase, entrada del usuario) y lo
// transforma al contrato unificado `UnifiedCard`.
//
// Es tolerante a las distintas convenciones de nombre de las fuentes:
//   - snake_case de la DB/catálogo local (set_id, card_name, market_price)
//   - camelCase de las APIs (setId, cardNumber, imageUrl)
//   - shapes anidados de TCGdex (set.id, set.name, images.small)
// Si un campo falta, se completa con un valor por defecto seguro — nunca
// revienta ante un objeto desconocido.
// ============================================================================

import { normalizeLanguage } from '@/lib/cardLanguage'
import { normalizeCurrency } from '@/lib/priceGuide'
import type { UnifiedCard } from '@/types/card'

type AnyRecord = Record<string, unknown>

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
    return Number(v)
  }
  return null
}

function asBoolean(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export function normalizeCard(input: unknown): UnifiedCard {
  const raw = (input ?? {}) as AnyRecord
  const set = (raw.set ?? {}) as AnyRecord
  const images = (raw.images ?? {}) as AnyRecord

  const cardNumber = asString(raw.cardNumber) ?? asString(raw.number) ?? ''
  const setCode =
    asString(raw.setCode) ??
    asString(raw.setId) ??
    asString(raw.set_id) ??
    asString(set.id) ??
    ''

  const id =
    asString(raw.id) ??
    asString(raw.card_id) ??
    (setCode && cardNumber ? `${setCode}-${cardNumber}` : '')

  const name = asString(raw.name) ?? asString(raw.card_name) ?? ''
  const setName =
    asString(raw.setName) ??
    asString(raw.set_name) ??
    asString(set.name) ??
    setCode

  const price =
    asNumber(raw.price) ??
    asNumber(raw.manual_price) ??
    asNumber(raw.market_price) ??
    null

  return {
    id,
    name,
    setName,
    setCode,
    cardNumber,
    language: normalizeLanguage(raw.language ?? raw.lang),
    rarity: asString(raw.rarity) ?? null,
    imageUrl:
      asString(raw.imageUrl) ??
      asString(raw.image) ??
      asString(images.small) ??
      asString(images.large) ??
      '',
    condition: asString(raw.condition) ?? null,
    price,
    currency: normalizeCurrency(raw.currency),
    isUserCustom: asBoolean(raw.isUserCustom ?? raw.is_user_reported)
  }
}