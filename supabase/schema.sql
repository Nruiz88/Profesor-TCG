-- ============================================================
-- Reseteo total + Schema v3 (Auth privado) del Virtual Binder
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- 1) Eliminar todo lo viejo (esquemas anteriores, data de prueba)
drop table if exists public.binder_pages cascade;
drop table if exists public.binder_slots cascade;
drop table if exists public.card_prices cascade;
drop table if exists public.binder_cards cascade;
drop table if exists public.binders cascade;

-- 2) Binders por usuario (cada usuario tiene el suyo)
create table if not exists public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Mi Colección',
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 3) Cartas asignadas a slots (posición 1..9 por hoja)
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

-- 4) RLS: cada usuario solo accede a sus propios datos
alter table public.binders enable row level security;
alter table public.binder_cards enable row level security;

-- binders: solo el dueño puede ver, insertar, actualizar y borrar
create policy "binders select own" on public.binders
  for select using (auth.uid() = user_id);

create policy "binders insert own" on public.binders
  for insert with check (auth.uid() = user_id);

create policy "binders update own" on public.binders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "binders delete own" on public.binders
  for delete using (auth.uid() = user_id);

-- binder_cards: solo a través de un binder propio
create policy "binder_cards select own" on public.binder_cards
  for select using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_cards insert own" on public.binder_cards
  for insert with check (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_cards update own" on public.binder_cards
  for update using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_cards delete own" on public.binder_cards
  for delete using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );