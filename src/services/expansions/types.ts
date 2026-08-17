// ============================================================================
// Tipos estandarizados del servicio de expansiones.
// Todos los proveedores (TCGdex, PokéAPI, catálogo local) devuelven la misma
// forma intermedia `ExpansionSource`, y el orquestador (index.ts) la completa
// con imágenes y normaliza en `ExpansionData`.
// ============================================================================

export interface ExpansionData {
  id: string
  name: string
  series: string
  releaseDate: string
  totalCards: number
  logoUrl: string
  symbolUrl: string
}

/** Forma intermedia que devuelve cada proveedor antes del merge final. */
export interface ExpansionSource {
  name?: string
  series?: string
  releaseDate?: string
  totalCards?: number
}
