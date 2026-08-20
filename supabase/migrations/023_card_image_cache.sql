-- ============================================================
-- 023: Cache persistente de imágenes de cartas
-- Guarda el resultado de resolveCardImage (URL final resuelta) para
-- evitar repetir la cadena de verificaciones a CDNs externos
-- (pokemontcg, Scrydex, TCGdex) en cada request.
--
-- Clave: set_id + number + language. La URL resuelta es pública.
-- Las escrituras las hace el service role (bypass de RLS), así el
-- cache no se puede envenenar desde el cliente.
-- ============================================================

create table if not exists public.card_image_cache (
  set_id text not null,
  number text not null,
  language text not null default 'EN',
  url text not null,
  updated_at timestamptz not null default now(),
  primary key (set_id, number, language)
);

alter table public.card_image_cache enable row level security;

-- La URL de la imagen es información pública: cualquiera puede leerla.
create policy "card_image_cache select"
  on public.card_image_cache
  for select
  using (true);

-- Índice temporal para limpiar entradas viejas (updated_at < now() - TTL)
create index if not exists idx_card_image_cache_updated_at
  on public.card_image_cache (updated_at);
