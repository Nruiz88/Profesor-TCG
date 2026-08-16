-- ============================================================
-- Reseteo total + Schema v3 (Auth privado) del Virtual Binder
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- 1) Eliminar todo lo viejo (esquemas anteriores, data de prueba)
drop table if exists public.trade_offers cascade;
drop table if exists public.binder_pages cascade;
drop table if exists public.binder_slots cascade;
drop table if exists public.card_prices cascade;
drop table if exists public.binder_cards cascade;
drop table if exists public.binders cascade;
drop table if exists public.profiles cascade;

-- 2) Perfiles de usuario (username, whatsapp, ubicación)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  whatsapp_number text,
  country text,
  city text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_profiles_username on public.profiles(username);

alter table public.profiles enable row level security;

create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles public read" on public.profiles
  for select using (
    exists (
      select 1 from public.binders b
      where b.user_id = profiles.id and b.is_public = true
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  base := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_.-]', '', 'g'));
  if base is null or base = '' then
    base := 'usuario';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || suffix::text;
    suffix := suffix + 1;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, candidate)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Binders por usuario (cada usuario tiene el suyo)
create table if not exists public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Mi Colección',
  description text,
  is_public boolean not null default false,
  cover_card_id uuid references public.binder_cards(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 4) Cartas asignadas a slots (posición 1..9 por hoja)
create table if not exists public.binder_cards (
  id uuid primary key default gen_random_uuid(),
  binder_id uuid references public.binders(id) on delete cascade not null,
  card_id text not null,          -- ej: 'base1-4'
  card_name text not null,        -- ej: 'Charizard'
  set_id text not null,           -- ej: 'base1'
  number text not null,           -- ej: '4'
  slot_number int not null,       -- Posición (1 a 9, etc.)
  market_price numeric(10, 2) default 0.00,
  status text not null default 'collection',   -- collection | for_sale | for_trade | reserved
  price_override numeric(10, 2),                -- precio manual (legacy, se sincroniza con price)
  is_for_sale boolean not null default false,   -- acepta venta
  is_for_trade boolean not null default false,  -- acepta intercambio
  price numeric(10, 2),                         -- precio del usuario (prima sobre market_price)
  trade_notes text,                             -- "¿Qué busco a cambio?" (opcional)
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (binder_id, slot_number),
  constraint binder_cards_status_check check (status in ('collection', 'for_sale', 'for_trade', 'reserved'))
);

create index if not exists idx_binder_cards_availability on public.binder_cards(is_for_sale, is_for_trade);

create index if not exists idx_binder_cards_binder on public.binder_cards(binder_id);
create index if not exists idx_binder_cards_updated on public.binder_cards(updated_at desc);

-- 5) RLS: cada usuario solo accede a sus propios datos
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

-- 6) Lectura pública de solo lectura: SOLO cuando is_public = true
create policy "binders public read" on public.binders
  for select using (is_public = true);

create policy "binder_cards public read" on public.binder_cards
  for select using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.is_public = true
    )
  );

-- 7) Caché de precios por carta (compartida entre usuarios)
-- Evita re-fetchear a TCGdex cartas repetidas entre binders y usuarios
-- 8) Propuestas de intercambio entre usuarios
create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  requested_card_id uuid references public.binder_cards(id) on delete cascade not null,
  offered_card_ids uuid[] not null default '{}',
  cash_offered numeric(10, 2) not null default 0,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  requested_snapshot jsonb not null,
  offered_snapshot jsonb not null default '[]'::jsonb,
  sender_snapshot jsonb not null,
  receiver_snapshot jsonb not null,
  constraint trade_offers_status_check check (status in ('pending', 'accepted', 'rejected', 'cancelled'))
);

create index if not exists idx_trade_offers_sender on public.trade_offers(sender_id);
create index if not exists idx_trade_offers_receiver on public.trade_offers(receiver_id);

alter table public.trade_offers enable row level security;

create policy "trade_offers select involved" on public.trade_offers
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "trade_offers insert own" on public.trade_offers
  for insert with check (auth.uid() = sender_id);

create policy "trade_offers update involved" on public.trade_offers
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);

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