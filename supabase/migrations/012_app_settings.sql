-- ============================================================
-- 012: Configuración de la app / API keys (integración PokeWallet)
-- Guarda claves de APIs externas (ej: PokeWallet) de forma SEGURA:
--  - Sin policies de RLS para el cliente: nadie puede leer ni
--    escribir desde el navegador. Solo el service role (server)
--    accede, y los endpoints de admin validan is_admin antes.
--  - El navegador nunca recibe la clave completa (solo máscara).
--  - Opcional: POKEWALLET_API_KEY como env var tiene prioridad.
-- ============================================================

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

-- Sin policies: RLS deniega todo al cliente. Solo el service role
-- (bypass de RLS) lee/escribe esta tabla desde el servidor.
