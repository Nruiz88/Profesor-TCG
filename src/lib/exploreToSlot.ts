import { toSlotCard, type SlotCard } from '@/lib/sheets'
import type { ExploreCard } from '@/app/api/public/explore/route'

/** Convierte una carta del market (ExploreCard) al contrato SlotCard para
 * renderizarla con el efecto holo/3D (PokemonCard) del binder.
 * Con `forceHolo`, las cartas sin variante especial (normal) se muestran con
 * foil holo para que ninguna quede plana en el market. */
export function exploreToSlot(card: ExploreCard, opts?: { forceHolo?: boolean }): SlotCard {
  const variant =
    opts?.forceHolo && card.variant === 'normal' ? 'holo' : (card.variant ?? null)
  return toSlotCard({
    id: card.id,
    binder_id: card.binder_id,
    card_id: card.card_id,
    card_name: card.card_name,
    set_id: card.set_id,
    set_name: card.set_name,
    number: card.number,
    slot_number: 0,
    market_price: null,
    status: card.status,
    price_override: null,
    is_for_sale: card.status === 'for_sale',
    is_for_trade: card.status === 'for_trade',
    price: card.price,
    trade_notes: null,
    condition: card.condition,
    language: card.language,
    manual_price: null,
    currency: card.currency,
    is_user_reported: !!card.is_user_reported,
    reserved_until: null,
    rarity: card.rarity ?? null,
    supertype: card.supertype ?? null,
    subtypes: card.subtypes ?? null,
    types: card.types ?? null,
    variant,
    image: card.image
  })
}