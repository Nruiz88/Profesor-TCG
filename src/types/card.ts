// ============================================================================
// Contrato unificado de Cartas (Clean Architecture).
// Fuente única de verdad para toda la información de cartas en la app.
//
// Los módulos de dominio (lib/cardStatus, lib/cardLanguage, lib/priceGuide)
// importan y re-exportan los tipos aquí definidos para mantener compatibilidad
// con el código existente: `import { CardStatus } from '@/lib/cardStatus'`
// sigue funcionando.
//
// Forma canónica de los card_id: `${setCode}-${cardNumber}` (ej: base1-4).
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
// UnifiedCard — contrato normalizado que consumen componentes, APIs y páginas.
// ---------------------------------------------------------------------------

/**
 * Carta unificada y normalizada, independiente de la fuente de datos
 * (TCGdex, pokemon-tcg-data, filas de Supabase o entrada del usuario).
 *
 * `normalizeCard()` (lib/normalizeCard) garantiza que cualquier respuesta de
 * API se transforme a esta forma. Los componentes reciben este contrato por
 * props (nunca hacen fetch directo).
 */
export interface UnifiedCard {
  /** Identificador único normalizado: `${setCode}-${cardNumber}`. */
  id: string
  /** Nombre de la carta (traducido si el proveedor lo entrega). */
  name: string
  /** Nombre de la expansión (ej: "Scarlet & Violet: 151"). */
  setName: string
  /** Código de la expansión (ej: "sv3pt5"). */
  setCode: string
  /** Número de la carta dentro de la expansión (ej: "6"). */
  cardNumber: string
  /** Idioma de la copia física. Default: 'ES'. */
  language?: CardLanguage
  /** Rareza de la carta. null si el proveedor no la reporta. */
  rarity?: string | null
  /** URL de la imagen de la carta. Vacío si no hay imagen resuelta. */
  imageUrl?: string
  /** Estado físico: Mint, Near Mint, Excellent, Good, Played, etc. */
  condition?: string | null
  /** Precio efectivo a mostrar. null = sin precio conocido / consultar. */
  price?: number | null
  /** Moneda del precio. Default: 'USD'. */
  currency?: Currency
  /** true si los datos provienen del usuario y no del catálogo. */
  isUserCustom?: boolean
}