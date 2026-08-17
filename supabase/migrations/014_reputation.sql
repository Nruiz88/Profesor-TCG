-- ============================================================
-- 014: Sistema de Reputación y Badges de Confianza
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- 1) Métricas de reputación en profiles
--    (location no se agrega: ya existen city + country con formatLocation)
alter table public.profiles add column if not exists total_sales integer not null default 0;
alter table public.profiles add column if not exists total_trades integer not null default 0;
alter table public.profiles add column if not exists rating_avg numeric(3, 2) not null default 5.00;
alter table public.profiles add column if not exists is_verified boolean not null default false;

-- 2) Transacciones: se registran cuando el comprador hace CLAIM con sesión.
--    kind captura el tipo de listado al momento del claim (venta/cambio).
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  card_id uuid references public.binder_cards(id) on delete set null,
  kind text not null default 'sale',
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  constraint claims_kind_check check (kind in ('sale', 'trade', 'both')),
  constraint claims_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create index if not exists idx_claims_buyer on public.claims(buyer_id);
create index if not exists idx_claims_seller on public.claims(seller_id);

alter table public.claims enable row level security;

create policy "claims select involved" on public.claims
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "claims insert buyer" on public.claims
  for insert with check (auth.uid() = buyer_id);

create policy "claims update involved" on public.claims
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 3) Reseñas: una por transacción y por participante (unique claim+reviewer)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid references public.claims(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewed_user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (claim_id, reviewer_id)
);

create index if not exists idx_reviews_reviewed on public.reviews(reviewed_user_id);
create index if not exists idx_reviews_claim on public.reviews(claim_id);

alter table public.reviews enable row level security;

-- Las reseñas son prueba social pública (solo se muestran datos agregados)
create policy "reviews select public" on public.reviews
  for select using (true);

create policy "reviews insert own" on public.reviews
  for insert with check (auth.uid() = reviewer_id);
