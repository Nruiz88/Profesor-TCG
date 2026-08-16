-- Schema del Virtual Binder de Profesor TCG
-- Ejecutar en Supabase SQL Editor

-- Páginas del binder (hojas de 3x3 = 9 slots)
create table if not exists public.binder_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Hoja nueva',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Slots de cada hoja (0 a 8, rejilla 3x3)
create table if not exists public.binder_slots (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.binder_pages(id) on delete cascade,
  slot integer not null check (slot between 0 and 8),
  card_id text not null,          -- ej: sv1-1
  card_name text not null,
  card_set_id text not null,      -- ej: sv1
  card_set_name text not null,
  card_number text not null,
  card_rarity text,
  card_image text not null,
  created_at timestamptz not null default now(),
  unique (page_id, slot)
);

-- Precios cacheados de las cartas (leídos sin llamadas externas)
create table if not exists public.card_prices (
  card_id text primary key,       -- ej: sv1-1
  market_price numeric,           -- precio de mercado (USD, TCGPlayer)
  updated_at timestamptz not null default now()
);

create index if not exists idx_binder_slots_page on public.binder_slots(page_id);
create index if not exists idx_card_prices_updated on public.card_prices(updated_at desc);

-- RLS: acceso público de solo lectura para demo (ajustar en producción)
alter table public.binder_pages enable row level security;
alter table public.binder_slots enable row level security;
alter table public.card_prices enable row level security;

create policy "binder_pages public read" on public.binder_pages for select using (true);
create policy "binder_slots public read" on public.binder_slots for select using (true);
create policy "card_prices public read" on public.card_prices for select using (true);

-- El service role key ya ignora RLS, así que los writes desde el servidor funcionan sin políticas.