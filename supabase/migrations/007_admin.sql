-- ============================================================
-- 007: Panel admin — flag is_admin en profiles
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- 1) Columna de rol admin (solo lectura para la app: nadie puede
--    auto-otorgarse el rol por RLS, ver trigger abajo)
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 2) Bloquear auto-grant: ningún usuario puede cambiarse su propio
--    is_admin a través de la API/RLS. El SQL Editor (postgres) y el
--    service role (auth.uid() null) sí pueden tocar el flag.
create or replace function public.prevent_admin_self_grant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.is_admin is distinct from old.is_admin
     and coalesce((select is_admin from public.profiles where id = auth.uid()), false) is not true
  then
    raise exception 'No tenés permisos para cambiar el rol admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_admin_self_grant on public.profiles;
create trigger trg_prevent_admin_self_grant
  before update of is_admin on public.profiles
  for each row execute function public.prevent_admin_self_grant();

-- 3) Marcar tu cuenta como admin (username derivado de niconqn.88@gmail.com)
update public.profiles set is_admin = true where username = 'niconqn.88';
