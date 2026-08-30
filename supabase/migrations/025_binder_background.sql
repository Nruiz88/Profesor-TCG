-- ============================================================
-- Migración: fondo del binder
-- ============================================================
-- Agrega:
--   background  text  — clave de la imagen de fondo de la carpeta
--                       (ej: 'aurora', 'cosmic'). NULL = usar la rotación
--                       automática por hoja (src/lib/binderBackgrounds.ts).
-- ============================================================

alter table public.binders
  add column if not exists background text;