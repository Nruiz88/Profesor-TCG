-- 016: Wantlist (cartas buscadas) con RLS
-- La wantlist es pública de lectura para permitir matchmaking entre usuarios.

create table if not exists public.wantlist_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_id text not null,
  card_name text not null,
  set_id text not null,
  set_name text,
  number text not null,
  max_budget numeric(10, 2),
  currency text not null default 'USD',
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, card_id)
);

create index if not exists idx_wantlist_user on public.wantlist_cards(user_id);
create index if not exists idx_wantlist_card on public.wantlist_cards(card_id, set_id);

alter table public.wantlist_cards enable row level security;

create policy "wantlist_cards select public"
  on public.wantlist_cards
  for select
  using (true);

create policy "wantlist_cards insert own"
  on public.wantlist_cards
  for insert
  with check (auth.uid() = user_id);

create policy "wantlist_cards update own"
  on public.wantlist_cards
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "wantlist_cards delete own"
  on public.wantlist_cards
  for delete
  using (auth.uid() = user_id);