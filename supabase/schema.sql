-- Schema del Virtual Binder de Profesor TCG (v2)
-- Ejecutar en Supabase SQL Editor

-- Binders por usuario
create table if not exists public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null default 'Mi Colección',
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Cartas asignadas a slots (posición 1..9 por hoja)
create table if not exists public.binder_cards (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid references public.binders(id) on delete cascade not null,
  card_id text not null,          -- ej: 'base1-4'
  card_name text not null,        -- ej: 'Charizard'
  set_id text not null,           -- ej: 'base1'
  number text not null,           -- ej: '4'
  slot_number int not null,       -- Posición (1 a 9, etc.)
  market_price numeric(10, 2) default 0.00,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (binder_id, slot_number)
);

create index if not exists idx_binder_cards_binder on public.binder_cards(binder_id);
create index if not exists idx_binder_cards_updated on public.binder_cards(updated_at desc);

-- RLS: acceso público de solo lectura para demo (ajustar en producción)
alter table public.binders enable row level security;
alter table public.binder_cards enable row level security;

create policy "binders public read" on public.binders for select using (true);
create policy "binder_cards public read" on public.binder_cards for select using (true);

-- El service role key ignora RLS, así que los writes desde el servidor funcionan sin políticas.