-- ============================================================
-- 024: Índices de rendimiento para búsqueda y marketplaces
-- Optimiza las queries más frecuentes de /api/public/explore y
-- /api/public/wantlist (filtros por set/estado y orden por recencia).
-- Solo crea índices: no altera datos ni esquema.
-- ============================================================

-- Explore: el filtro más común es explorar por set las cartas en
-- venta/cambio. Índice compuesto que cubre set + estado.
create index if not exists idx_binder_cards_set_status
  on public.binder_cards (set_id, is_for_sale, is_for_trade);

-- Explore: ordenamiento por recencia (sort default 'recent').
create index if not exists idx_binder_cards_updated_at
  on public.binder_cards (updated_at desc);

-- Wantlist: ordenamiento por recencia (created_at desc).
create index if not exists idx_wantlist_cards_created_at
  on public.wantlist_cards (created_at desc);

-- Join de binder_cards con binders (explore une por binder_id).
create index if not exists idx_binder_cards_binder_id
  on public.binder_cards (binder_id);
