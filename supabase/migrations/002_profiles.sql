-- ============================================================
-- Migración: perfiles de usuario (profiles)
-- Aplicar en Supabase SQL Editor sobre la base existente.
-- NO borra datos: crea la tabla nueva, sus políticas RLS y el
-- trigger que crea el perfil automáticamente al registrarse.
-- ============================================================

-- 1) Tabla de perfiles (1 fila por usuario de auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,          -- @username público (para URLs /binder/[username])
  whatsapp_number text,                    -- ej: 549299XXXXXXX (solo dígitos, con código de país)
  country text,                            -- ej: Argentina
  city text,                               -- ej: Neuquén
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Índice extra por username para búsquedas por URL
create index if not exists idx_profiles_username on public.profiles(username);

-- 2) RLS: el usuario solo edita su propio perfil
alter table public.profiles enable row level security;

create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Lectura pública: cualquier visitante puede ver el perfil del dueño de un
-- binder público (para el badge del vendedor en la vista pública).
create policy "profiles public read" on public.profiles
  for select using (
    exists (
      select 1 from public.binders b
      where b.user_id = profiles.id and b.is_public = true
    )
  );

-- 3) Trigger: crear el perfil automáticamente al registrarse.
-- El username se deriva del email (parte antes del @) y, si ya existe,
-- se agrega un sufijo numérico hasta encontrar uno libre.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
