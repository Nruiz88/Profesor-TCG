-- 018: Seguidores + energía favorita
-- - Columna favorite_energy en profiles (tipo de energía preferida, ej: Fuego)
-- - Tabla followers (relación seguidor -> seguido) con RLS
--   * lectura pública (perfil público muestra contador de seguidores)
--   * insert/delete solo del propio seguidor (auth.uid() = follower_id)
--   * bloqueo: no seguirse a uno mismo (check en tabla)

-- 1) Energía favorita en el perfil
alter table public.profiles add column if not exists favorite_energy text;

-- 2) Tabla de seguidores
create table if not exists public.followers (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists idx_followers_following on public.followers(following_id);
create index if not exists idx_followers_follower on public.followers(follower_id);

alter table public.followers enable row level security;

-- Lectura pública: cualquiera puede ver quién sigue a quién
-- (necesario para mostrar el contador de seguidores en perfiles públicos).
create policy "followers select public"
  on public.followers
  for select
  using (true);

-- Solo el seguidor puede crear su propia relación de follow
create policy "followers insert own"
  on public.followers
  for insert
  with check (auth.uid() = follower_id);

-- Solo el seguidor puede eliminar su propia relación
create policy "followers delete own"
  on public.followers
  for delete
  using (auth.uid() = follower_id);