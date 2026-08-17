-- ============================================================
-- 010: Carga manual de precio con guía de referencia externa
-- Ejecutar en Supabase SQL Editor (corre tal cual está)
-- ============================================================

-- Precio ingresado a mano por el usuario (para cartas sin valor automático
-- o ediciones especiales/importadas). Se mantiene sincronizado con price /
-- price_override para que el resto de la app (effectivePrice, claims,
-- marketplace) siga funcionando sin cambios.
alter table public.binder_cards
  add column if not exists manual_price numeric(10, 2);

-- Moneda del precio manual (USD por defecto)
alter table public.binder_cards
  add column if not exists currency text not null default 'USD';

-- true cuando el precio fue reportado por el usuario (vs. valor automático)
alter table public.binder_cards
  add column if not exists is_user_reported boolean not null default false;
