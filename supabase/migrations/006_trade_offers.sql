-- ============================================================
-- Migración: sistema de propuestas de intercambio (trade_offers)
-- ============================================================
-- Conecta la negociación entre binders de distintos usuarios.
-- Guarda SNAPSHOTS de las cartas y perfiles al momento de crear la oferta:
-- el receptor no siempre puede leer las cartas/perfil del oferente por RLS
-- (binder privado), así que la bandeja se arma desde estos snapshots.
--
--   sender_id            usuario que ofrece
--   receiver_id          dueño de la carta deseada
--   requested_card_id    carta que se quiere obtener (binder_cards)
--   offered_card_ids     cartas ofrecidas a cambio (binder_cards)
--   cash_offered         dinero extra en efectivo (USD)
--   message              nota del oferente
--   status               pending | accepted | rejected | cancelled
--   *_snapshot           copia de datos de la carta / perfil al crearse
-- ============================================================

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  requested_card_id uuid references public.binder_cards(id) on delete cascade not null,
  offered_card_ids uuid[] not null default '{}',
  cash_offered numeric(10, 2) not null default 0,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),

  -- Snapshots (JSON) para armar la bandeja sin depender de RLS cruzado
  requested_snapshot jsonb not null,
  offered_snapshot jsonb not null default '[]'::jsonb,
  sender_snapshot jsonb not null,
  receiver_snapshot jsonb not null,

  constraint trade_offers_status_check check (status in ('pending', 'accepted', 'rejected', 'cancelled'))
);

create index if not exists idx_trade_offers_sender on public.trade_offers(sender_id);
create index if not exists idx_trade_offers_receiver on public.trade_offers(receiver_id);

alter table public.trade_offers enable row level security;

-- LECTURA: solo los dos involucrados ven la oferta
create policy "trade_offers select involved" on public.trade_offers
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- ESCRITURA: solo el sender autenticado crea ofertas
create policy "trade_offers insert own" on public.trade_offers
  for insert with check (auth.uid() = sender_id);

-- ACTUALIZACIÓN: ambos pueden cambiar el status (aceptar/rechazar/cancelar)
create policy "trade_offers update involved" on public.trade_offers
  for update using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (auth.uid() = sender_id or auth.uid() = receiver_id);
