// Resultado de búsqueda del catálogo (GET /api/search).
// Lo comparten el modal de bolsillo, el buscador del binder y la calculadora
// de trueque justo, para que todos rendericen la misma tarjeta.
export interface SearchResult {
  id: string
  name: string
  number: string
  rarity: string | null
  set_id: string
  set_name: string
  image: string
}
