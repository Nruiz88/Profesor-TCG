import { buildWhatsAppLink, sanitizeWhatsAppText } from '@/lib/whatsapp'
import type { WantlistMatch } from '@/types/wantlist'

// Cliente mínimo compatible con el cliente RLS y el de service role: ambos
// exponen .from(table) con la misma cadena (mismo patrón que explore/route).
type QueryClient = {
  from: (table: string) => any
}

// ---------------------------------------------------------------------------
// Matchmaking: comparar la wantlist del comprador contra las cartas en venta
// (for_sale) del vendedor. Devuelve solo coincidencias EXACTAS (misma carta y
// mismo set). El cliente se recibe como parámetro para que el llamador decida
// si usa RLS (sesión del usuario) o service role (lectura completa).
// ---------------------------------------------------------------------------
export async function findWantlistMatches(
  buyerId: string,
  sellerId: string,
  client: QueryClient
): Promise<WantlistMatch[]> {
  const { data: wantlist } = await client
    .from('wantlist_cards')
    .select('id, card_id, card_name, set_id, set_name, number, max_budget, currency')
    .eq('user_id', buyerId)
  if (!wantlist || wantlist.length === 0) return []

  const { data: binders } = await client
    .from('binders')
    .select('id')
    .eq('user_id', sellerId)
  const binderIds = (binders || []).map((b: { id: string }) => b.id)
  if (binderIds.length === 0) return []

  const { data: sellerCards } = await client
    .from('binder_cards')
    .select('id, card_id, set_id, price, price_override, currency')
    .in('binder_id', binderIds)
    .eq('is_for_sale', true)
  if (!sellerCards || sellerCards.length === 0) return []

  // Índice del vendedor por "card_id::set_id" (la primera carta listada gana)
  const sellerIndex = new Map<string, { slotId: string; price: number | null; currency: string | null }>()
  for (const c of sellerCards) {
    const key = `${c.card_id}::${c.set_id}`
    if (!sellerIndex.has(key)) {
      sellerIndex.set(key, {
        slotId: c.id,
        price: c.price ?? c.price_override ?? null,
        currency: c.currency ?? null
      })
    }
  }

  // Matcheo exacto contra la wantlist del comprador
  const matches: WantlistMatch[] = []
  for (const w of wantlist) {
    const s = sellerIndex.get(`${w.card_id}::${w.set_id}`)
    if (!s) continue
    matches.push({
      wantId: w.id,
      cardId: w.card_id,
      cardName: w.card_name,
      setId: w.set_id,
      set_name: w.set_name,
      number: w.number,
      maxBudget: w.max_budget,
      currency: w.currency,
      sellerSlotId: s.slotId,
      sellerPrice: s.price,
      sellerCurrency: s.currency
    })
  }

  return matches
}

// ---------------------------------------------------------------------------
// Deep link de WhatsApp "¡Yo la tengo!": el vendedor ofrece su carta al dueño
// de la wantlist. El mensaje se arma con Markdown nativo de WhatsApp y todo se
// sanitiza antes de codificar la URL.
// ---------------------------------------------------------------------------
export interface SwapOfferParams {
  /** Username del dueño de la wantlist (destinatario, se saluda con @). */
  sellerUsername: string
  /** WhatsApp del dueño de la wantlist (se limpia a dígitos). */
  sellerPhone: string
  cardName: string
  setName: string
  cardNumber?: string
  /** URL del slot en el binder del oferente. */
  slotUrl: string
}

export function buildSwapOfferUrl(params: SwapOfferParams): string {
  const seller = sanitizeWhatsAppText(params.sellerUsername) || 'coleccionista'
  const cardName = sanitizeWhatsAppText(params.cardName)
  const setName = sanitizeWhatsAppText(params.setName)
  const number = sanitizeWhatsAppText(params.cardNumber)
  const slotUrl = sanitizeWhatsAppText(params.slotUrl)

  const cardLine = `*${cardName}*${number ? ` (#${number})` : ''}`
  const message = [
    `¡Hola @${seller}! Vi en tu Wantlist de TCG Claim que buscas ${cardLine} (${setName}).`,
    `Yo la tengo disponible en mi Binder (${slotUrl}).`,
    '¿Te interesa coordinar un Swap? 🚀'
  ].join('\n')

  return buildWhatsAppLink(params.sellerPhone, message)
}
