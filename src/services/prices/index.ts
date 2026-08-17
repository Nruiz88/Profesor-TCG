// ============================================================================
// Servicio de precios — orquestador de referencias de mercado (Service Pattern).
//
// Unifica en una sola llamada los deep links de las plataformas de referencia
// (PriceCharting, eBay sold, Cardmarket) para que los componentes reciban la
// lista completa sin conocer los detalles de cada plataforma.
//
// Implementación concreta de URLs en lib/priceGuide (builders puros).
// ============================================================================

import {
  buildCardmarketUrl,
  buildEbayUrl,
  buildPriceChartingUrl
} from '@/lib/priceGuide'
import type { MarketReference, PriceReferenceQuery } from './types'

export type { MarketReference, PriceReferenceQuery } from './types'

/** Referencias de mercado para una carta, en orden de prioridad sugerido. */
export function buildMarketReferences(
  query: PriceReferenceQuery
): MarketReference[] {
  return [
    {
      id: 'pricecharting',
      label: 'PriceCharting',
      url: buildPriceChartingUrl(query)
    },
    {
      id: 'ebay',
      label: 'eBay (ventas reales)',
      url: buildEbayUrl(query)
    },
    {
      id: 'cardmarket',
      label: 'Cardmarket',
      url: buildCardmarketUrl(query)
    }
  ]
}