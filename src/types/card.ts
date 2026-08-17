// ============================================================================
// Contrato unificado de Cartas (Clean Architecture).
// Fuente única de verdad para toda la información de cartas en la app.
//
// Los módulos de dominio (lib/cardStatus, lib/cardLanguage, lib/priceGuide)
// importan y re-exportan los tipos aquí definidos para mantener compatibilidad
// con el código existente: `import { CardStatus } from '@/lib/cardStatus'`
// sigue funcionando.
//
// Forma los card_id: `${setId}-${number}` (ej: base1-4, swshp-SWSH076).
// ============================================================================

// ---------------------------------------------------------------------------
// Valores de dominio (tuplas cerradas del TCG)
// ---------------------------------------------------------------------------

/** Estado de una carta en el binder (SQL binder_cards.status). */
export type CardStatus = 'collection' | 'for_sale' | 'for_trade' | 'reserved'

/** Modalidad de disponibilidad que ofrece el dueño con la carta. */
export type Availability =
  | 'solo_coleccion'
  | 'solo_venta'
  | 'solo_cambio'
  | 'venta_o_cambio'

/** Idioma de la copia física (SQL binder_cards.language). */
export type CardLanguage = 'ES' | 'EN' | 'JP' | 'KO' | 'ZH'

/** Moneda del precio (SQL binder_cards.currency). */
export type Currency = 'USD' | 'EUR' | 'ARS'

// ---------------------------------------------------------------------------
// Formas de la carta en el catálogo (pokemon-tcg-data / TCGdex)
// ---------------------------------------------------------------------------

export interface CardImages {
  small: string
  large: string
}

export interface CardAttack {
  name: string
  cost?: string[]
  convertedEnergyCost?: number
  damage?: string
  text?: string
}

export interface CardAbility {
  name: string
  text: string
  type?: string
}

export interface CardWeaknessResistance {
  type: string
  value: string
}

/** Identidad de la carta dentro del catálogo (lo que resuelve /api/cards/:id). */
export interface CardCatalogInfo {
  id: string
  name: string
  supertype?: string
  subtypes?: string[]
  hp?: string
  types?: string[]
  evolvesFrom?: string
  evolvesTo?: string[]
  attacks?: CardAttack[]
  abilities?: CardAbility[]
  weaknesses?: CardWeaknessResistance[]
  resistances?: CardWeaknessResistance[]
  retreatCost?: string[]
  convertedRetreatCost?: number
  number: string
  artist?: string
  rarity?: string
  flavorText?: string
  nationalPokedexNumbers?: number[]
  legalities?: Record<string, string>
  set_id: string
  set_name: string
  image: string
  images?: CardImages
}

// ---------------------------------------------------------------------------
// Estado de listado dentro de un binder (SQL binder_cards)
// ---------------------------------------------------------------------------

/** Columnas de binder_cards relevantes para precio, venta y estado. */
export interface CardListingInfo {
  market_price: number | null
  price_override: number | null
  price: number | null
  manual_price: number | null
  currency: Currency
  is_user_reported: boolean
  status: CardStatus
  is_for_sale: boolean
  is_for_trade: boolean
  availability: Availability
  condition?: string | null
  trade_notes?: string | null
  language: CardLanguage
  reserved_until: string | null
  updated_at: string
}

// ---------------------------------------------------------------------------
// UnifiedCard — contrato normalizado que consumen componentes, APIs y páginas.
// ---------------------------------------------------------------------------

/**
 * Carta unificada: identidad de catálogo + estado de listado + ubicación en el
 * binder. Todo módulo que necesite "una carta" debe tipar contra este contrato
 * y recibirlo por props (los componentes nunca hacen fetch directo).
 *
 * `effectivePrice` es el precio a mostrar: user price > override > mercado
 * (ver effectivePrice en lib/cardStatus).
 */
export interface UnifiedCard extends CardCatalogInfo, CardListingInfo {
  binder_id: string
  slot_number: number
  effectivePrice: number | null
}