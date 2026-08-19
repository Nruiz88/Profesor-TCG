-- 021: Variantes reales del TCG moderno
-- Amplía la columna variant de 30 a 50 chars y crea un enum con CHECK constraint.

ALTER TABLE public.binder_cards
  DROP COLUMN IF EXISTS variant;

ALTER TABLE public.binder_cards
  ADD COLUMN variant text NOT NULL DEFAULT 'normal';

-- Los valores válidos cubren las variantes reales del TCG moderno.
ALTER TABLE public.binder_cards
  ADD CONSTRAINT binder_cards_variant_check
  CHECK (variant IN (
    'normal',
    'holo',
    'reverse_holo',
    'v',
    'v_full_art',
    'v_alternate_art',
    'vmax',
    'vmax_alternate',
    'vmax_rainbow',
    'vstar',
    'trainer_full_art',
    'rainbow_rare',
    'secret_rare_gold'
  ));
