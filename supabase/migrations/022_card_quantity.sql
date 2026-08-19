-- 022_card_quantity.sql
-- Agrega columna quantity a binder_cards para permitir tener varias copias de
-- la misma carta en un mismo bolsillo. Cada slot guarda la cantidad, y se
-- muestra un contador sobre la carta.

ALTER TABLE binder_cards
  ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;

-- La cantidad debe ser al menos 1 (una fila representa al menos una copia).
ALTER TABLE binder_cards
  DROP CONSTRAINT IF EXISTS binder_cards_quantity_check;

ALTER TABLE binder_cards
  ADD CONSTRAINT binder_cards_quantity_check CHECK (quantity >= 1);
