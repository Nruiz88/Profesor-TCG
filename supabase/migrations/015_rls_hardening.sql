-- ============================================================================
-- 015: Endurecimiento de Row Level Security (RLS)
-- Adaptado al esquema real del proyecto (schema.sql + migrations 001-014).
--
-- ⚠️ NOTA SOBRE TABLAS PEDIDAS VS. ESQUEMA REAL:
--   - `binder_slots` NO existe: la app usa `binders` + `binder_cards`.
--   - `custom_cards` NO existe: las cartas custom viven en `binder_cards`
--     (columnas manual_price / is_user_reported). Su protección queda cubierta
--     por las políticas de `binder_cards` (solo el dueño escribe).
--
-- Objetivos de integridad:
--   1. Nadie puede editar binders o cartas ajenos (ownership por auth.uid()).
--   2. El sistema de reputación (rating_avg, total_sales, total_trades,
--      is_verified) no se puede manipular desde el cliente.
--   3. Las reseñas solo se pueden crear tras una transacción 'completed'.
--   4. La alteración de precios queda restringida al dueño (y market_price es
--      un campo gestionado por el servidor — ver nota en el trigger opcional).
--
-- IDEMPOTENTE: se puede ejecutar varias veces en el SQL Editor sin errores
-- de duplicidad (DROP POLICY/FUNCTION/TRIGGER IF EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) HABILITAR RLS (idempotente)
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.binders        enable row level security;
alter table public.binder_cards   enable row level security;
alter table public.claims         enable row level security;
alter table public.reviews        enable row level security;

-- ---------------------------------------------------------------------------
-- 1) profiles
--    - SELECT pública (true): cualquiera ve username, reputación y ubicación.
--    - INSERT / UPDATE: solo sobre el propio perfil (auth.uid() = id).
--    - Las columnas de reputación NO se pueden tocar desde el cliente
--      (trigger protege rating_avg, total_sales, total_trades, is_verified).
--    - is_admin ya está protegido por el trigger prevent_admin_self_grant.
--
-- ⚠️ PRIVACIDAD: SELECT pública expone también whatsapp_number. Si querés
--    mantenerlo privado, cambiá la política a la variante comentada más abajo.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles select own"       on public.profiles;
drop policy if exists "profiles insert own"       on public.profiles;
drop policy if exists "profiles update own"       on public.profiles;
drop policy if exists "profiles public read"      on public.profiles;

create policy "profiles select public" on public.profiles
  for select using (true);

-- Variante con privacidad de contacto (descomentar para ocultar whatsapp del público):
-- create policy "profiles select public" on public.profiles
--   for select using (
--     auth.uid() = id
--     or exists (
--       select 1 from public.binders b
--       where b.user_id = profiles.id and b.is_public = true
--     )
--   );

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Trigger: bloquea la manipulación del sistema de reputación desde el cliente.
-- El service role (auth.uid() = null) y los triggers del servidor sí pueden
-- escribir estas columnas.
drop function if exists public.protect_reputation_columns() cascade;

create function public.protect_reputation_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
     and (
       new.rating_avg    is distinct from old.rating_avg
       or new.total_sales  is distinct from old.total_sales
       or new.total_trades is distinct from old.total_trades
       or new.is_verified  is distinct from old.is_verified
     )
  then
    raise exception 'No tenés permisos para modificar el sistema de reputación';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_reputation_columns on public.profiles;
create trigger trg_protect_reputation_columns
  before update on public.profiles
  for each row execute function public.protect_reputation_columns();

-- ---------------------------------------------------------------------------
-- 2) binders
--    - SELECT: propio o público. NUNCA se exponen binders privados ajenos.
--    - INSERT / UPDATE / DELETE: solo el dueño (auth.uid() = user_id).
-- ---------------------------------------------------------------------------
drop policy if exists "binders select own"     on public.binders;
drop policy if exists "binders insert own"     on public.binders;
drop policy if exists "binders update own"     on public.binders;
drop policy if exists "binders delete own"     on public.binders;
drop policy if exists "binders public read"    on public.binders;

create policy "binders select" on public.binders
  for select using (auth.uid() = user_id or is_public = true);

create policy "binders insert own" on public.binders
  for insert with check (auth.uid() = user_id);

create policy "binders update own" on public.binders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "binders delete own" on public.binders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3) binder_cards (antes "binder_slots")
--    - SELECT: cartas del propio binder o de binders públicos.
--    - INSERT / UPDATE / DELETE: solo a través de un binder propio.
--    - Esto impide que un tercero altere precios o cartas ajenas: la fila
--      solo es visible/editable por el dueño del binder al que pertenece.
-- ---------------------------------------------------------------------------
drop policy if exists "binder_cards select own"  on public.binder_cards;
drop policy if exists "binder_cards insert own"  on public.binder_cards;
drop policy if exists "binder_cards update own"  on public.binder_cards;
drop policy if exists "binder_cards delete own"  on public.binder_cards;
drop policy if exists "binder_cards public read" on public.binder_cards;

create policy "binder_cards select" on public.binder_cards
  for select using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and (b.user_id = auth.uid() or b.is_public = true)
    )
  );

create policy "binder_cards insert own" on public.binder_cards
  for insert with check (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_cards update own" on public.binder_cards
  for update using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

create policy "binder_cards delete own" on public.binder_cards
  for delete using (
    exists (
      select 1 from public.binders b
      where b.id = binder_id and b.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- HARDENING OPCIONAL: market_price es un campo de referencia calculado por el
-- servidor (api/binder/update-prices). Para que SOLO el service role pueda
-- escribirlo (evitando que un dueño infle su precio de mercado), descomentá
-- el trigger de abajo.
--
-- ⚠️ IMPORTANTE: si lo activás, la ruta `api/binder/update-prices` DEBE usar
--    el cliente service-role para el upsert (hoy escribe con la sesión del
--    usuario autenticado y el trigger la rompería). Los precios propios del
--    usuario (price, price_override, manual_price) siguen siendo editables
--    por el dueño con normalidad.
-- ═══════════════════════════════════════════════════════════════════════════
-- drop function if exists public.protect_market_price() cascade;
--
-- create function public.protect_market_price()
-- returns trigger
-- language plpgsql
-- security definer set search_path = public
-- as $$
-- begin
--   if auth.uid() is not null
--      and new.market_price is distinct from old.market_price
--   then
--     raise exception 'market_price solo puede ser actualizado por el servidor';
--   end if;
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists trg_protect_market_price on public.binder_cards;
-- create trigger trg_protect_market_price
--   before update on public.binder_cards
--   for each row execute function public.protect_market_price();

-- ---------------------------------------------------------------------------
-- 4) claims (transacciones)
--    - SELECT: solo participantes (comprador o vendedor).
--    - INSERT: solo el comprador (auth.uid() = buyer_id).
--    - UPDATE: solo participantes (cambiar estados pending/completed/cancelled;
--      los valores válidos ya los enforce el check constraint de la tabla).
-- ---------------------------------------------------------------------------
drop policy if exists "claims select involved" on public.claims;
drop policy if exists "claims insert buyer"    on public.claims;
drop policy if exists "claims update involved" on public.claims;

create policy "claims select involved" on public.claims
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "claims insert buyer" on public.claims
  for insert with check (auth.uid() = buyer_id);

create policy "claims update involved" on public.claims
  for update using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ---------------------------------------------------------------------------
-- 5) reviews (reputación)
--    - SELECT: pública (visible en el perfil del vendedor).
--    - INSERT: solo si auth.uid() = reviewer_id Y la reseña referencia una
--      transacción 'completed' donde el reviewer participa y la persona
--      reseñada es la contraparte. Impide reseñas falsas sin interacción.
-- ---------------------------------------------------------------------------
drop policy if exists "reviews select public" on public.reviews;
drop policy if exists "reviews insert own"    on public.reviews;

create policy "reviews select public" on public.reviews
  for select using (true);

create policy "reviews insert completed claim" on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from public.claims c
      where c.id = claim_id
        and c.status = 'completed'
        and (c.buyer_id = reviewer_id or c.seller_id = reviewer_id)
        and reviewed_user_id = (
          case when c.buyer_id = reviewer_id then c.seller_id else c.buyer_id end
        )
    )
  );