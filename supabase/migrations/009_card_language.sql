-- ============================================================
-- 009: Idioma de la copia física de cada carta
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- Idioma de la carta tal como se ve en la copia física del usuario:
--   ES = Español · EN = Inglés · JP = Japonés · KO = Coreano · ZH = Chino
-- Default 'ES': las cartas existentes quedan como Español.
alter table public.binder_cards
  add column if not exists language text not null default 'ES';

-- Restricción de valores válidos
alter table public.binder_cards
  drop constraint if exists binder_cards_language_check;

alter table public.binder_cards
  add constraint binder_cards_language_check
  check (language in ('ES', 'EN', 'JP', 'KO', 'ZH'));

-- Índice para filtrar por idioma en el marketplace / binder
create index if not exists idx_binder_cards_language on public.binder_cards(language);
