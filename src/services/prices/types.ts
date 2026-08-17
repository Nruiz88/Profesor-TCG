// ============================================================================
// Tipos del servicio de referencias de mercado.
// El query de búsqueda es el mismo que usan los builders de deep links
// (lib/priceGuide) y `MarketReference` es la forma normalizada que consume la UI.
// ============================================================================

/** Metadatos mínimos de una carta para armar búsquedas de referencia externas. */
export interface PriceReferenceQuery {
  cardName: string
  setId: string
  set_name?: string | null
  number: string
  language?: string | null
}

/** Deep link de referencia de mercado, listo para el cliente. */
export interface MarketReference {
  id: 'pricecharting' | 'ebay' | 'cardmarket'
  label: string
  url: string
}