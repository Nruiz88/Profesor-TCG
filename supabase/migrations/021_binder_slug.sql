-- 021_binder_slug.sql
-- Agrega columna slug a binders para URLs públicas cortas y amigables
-- (/b/<slug>). El slug se genera a partir del título del binder y es único
-- por usuario. Los binders existentes se backfillean al vuelo por la app
-- (lib/binderSlug.ts) en cuanto se leen o comparten.

ALTER TABLE public.binders
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unicidad por usuario (slug global de un usuario). Permite NULL (binders
-- aún sin slug) hasta que la app los genere.
CREATE UNIQUE INDEX IF NOT EXISTS idx_binders_slug_per_user
  ON public.binders (user_id, slug)
  WHERE slug IS NOT NULL;
