-- ============================================================
-- Migración: disponibilidad de cartas (venta / cambio / ambas)
-- ============================================================
-- Agrega a binder_cards la modalidad de disponibilidad:
--   is_for_sale   boolean — acepta venta
--   is_for_trade  boolean — acepta intercambio
--   price         numeric — precio del usuario (prima sobre market_price)
--   trade_notes   text    — "¿Qué busco a cambio?" (opcional)
-- Mantiene status/price_override por compatibilidad con el resto de la app:
-- el modal escribe las flags y el PATCH sincroniza status derivado.
-- ============================================================

alter table public.binder_cards
  add column if not exists is_for_sale boolean not null default false,
  add column if not exists is_for_trade boolean not null default false,
  add column if not exists price numeric(10, 2),
  add column if not exists trade_notes text;

-- Backfill desde el modelo anterior (status + price_override)
update public.binder_cards
set is_for_sale = (status = 'for_sale'),
    is_for_trade = (status = 'for_trade'),
    price = price_override
where status in ('for_sale', 'for_trade')
   or price_override is not null;

create index if not exists idx_binder_cards_availability
  on public.binder_cards(is_for_sale, is_for_trade);
