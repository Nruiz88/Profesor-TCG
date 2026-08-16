-- ============================================================
-- Migración: administración de carpetas (binders)
-- ============================================================
-- Agrega:
--   description    text  — descripción del álbum (opcional)
--   cover_card_id  uuid  — carta elegida como portada del binder
--                          (referencia a binder_cards, se limpia al borrarla)
-- ============================================================

alter table public.binders
  add column if not exists description text,
  add column if not exists cover_card_id uuid
    references public.binder_cards(id) on delete set null;
