-- 026_premium.sql
-- Agrega columna is_premium a profiles para funcionalidades de pago.

alter table public.profiles
  add column if not exists is_premium boolean not null default false;
