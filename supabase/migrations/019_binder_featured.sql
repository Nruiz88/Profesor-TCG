-- 019_binder_featured.sql
-- Agrega columna is_featured a binder_cards para el sistema de cartas destacadas
-- del perfil (máximo 4 cartas destacadas por usuario).

ALTER TABLE binder_cards
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para queries rápidas de cartas destacadas por binder
CREATE INDEX IF NOT EXISTS idx_binder_cards_featured
  ON binder_cards (binder_id)
  WHERE is_featured = TRUE;

-- Validar que un usuario no tenga más de 4 cartas destacadas
-- (se valida en la API, pero el CHECK sirve como safety net)
-- NOTA: La restricción se maneja en la lógica de la aplicación porque
-- un usuario puede tener múltiples binders.
