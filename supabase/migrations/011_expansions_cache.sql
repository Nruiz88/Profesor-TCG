-- ============================================================
-- 011: Caché de expansiones (servicio Multi-API resiliente)
-- Guarda el resultado procesado de getExpansionData para evitar
-- llamadas redundantes a las APIs externas (TCGdex, GitHub, etc.).
-- ============================================================

create table if not exists public.expansions_cache (
  set_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Los datos de una expansión son información pública: cualquiera puede leerlos.
-- Las escrituras las hace el service role (bypass de RLS), así la caché no se
-- puede envenenar desde el cliente.
alter table public.expansions_cache enable row level security;

create policy "expansions_cache_select"
  on public.expansions_cache
  for select
  using (true);

-- Índice temporal para limpiar entradas viejas (updated_at < now() - 24h)
create index if not exists idx_expansions_cache_updated_at
  on public.expansions_cache (updated_at);
