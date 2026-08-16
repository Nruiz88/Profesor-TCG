-- ============================================================
-- Migración: caché de precios por carta (card_prices)
-- Aplicar en Supabase SQL Editor sobre la base existente.
-- NO borra datos: solo crea la tabla nueva y sus políticas RLS.
-- ============================================================

create table if not exists public.card_prices (
  card_id text primary key,          -- ej: 'base1-4'
  market_price numeric(10, 2),       -- null = sin precio conocido
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.card_prices enable row level security;

-- Cualquier usuario autenticado puede leer y escribir la caché
-- (son datos de precios públicos, no sensibles)
create policy "card_prices read authenticated" on public.card_prices
  for select using (auth.role() = 'authenticated');

create policy "card_prices write authenticated" on public.card_prices
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
