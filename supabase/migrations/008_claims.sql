-- ============================================================
-- 008: WhatsApp Claim — soft lock 24h + condición de carta
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- 1) Soft Lock de 24h: cuando un comprador hace CLAIM, la carta pasa a
--    status 'reserved' y se guarda hasta cuándo (UTC). Al expirar, la API
--    la revierte automáticamente según sus flags de disponibilidad.
alter table public.binder_cards add column if not exists reserved_until timestamptz;

-- 2) Condición física de la carta (para el mensaje del claim / kit):
--    valores libres sugeridos: Mint, Near Mint, Excellent, Good, Played.
alter table public.binder_cards add column if not exists condition text;

-- Índice para barrer reservas expiradas de forma barata
create index if not exists idx_binder_cards_reserved_until on public.binder_cards(reserved_until)
  where status = 'reserved';
