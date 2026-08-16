-- ============================================================
-- Migración: estado de las cartas (status + price_override)
-- Aplicar en Supabase SQL Editor sobre la base existente.
-- Agrega columnas a binder_cards (la tabla de cartas del proyecto).
-- NO borra datos.
-- ============================================================

-- 1) Columna de estado: collection (default) | for_sale | for_trade | reserved
alter table public.binder_cards
  add column if not exists status text not null default 'collection';

-- 2) Precio manual: si el usuario define uno, prima sobre el de la API
alter table public.binder_cards
  add column if not exists price_override numeric(10, 2);

-- 3) Restricción de valores válidos
alter table public.binder_cards
  drop constraint if exists binder_cards_status_check;

alter table public.binder_cards
  add constraint binder_cards_status_check
  check (status in ('collection', 'for_sale', 'for_trade', 'reserved'));

-- 4) Índice para filtrar cartas en venta / cambio
create index if not exists idx_binder_cards_status on public.binder_cards(status);
