/**
 * Esquemas de validación Zod para las API routes.
 *
 * Cada esquema define los parámetros permitidos y sus restricciones.
 * Valores por defecto seguros para parámetros opcionales.
 */

import { z } from 'zod'

// ── Comunes ─────────────────────────────────────────────────────────

/** Texto de búsqueda libre: max 200 chars, sanitizado */
const safeQuery = z
  .string()
  .max(200, 'Búsqueda demasiado larga')
  .optional()
  .default('')

/** ID UUID v4 */
const uuid = z.string().uuid('ID inválido')

/** Límite de resultados: 1-100, default 60 */
const limit = z.coerce
  .number()
  .int()
  .min(1, 'Mínimo 1 resultado')
  .max(100, 'Máximo 100 resultados')
  .optional()
  .default(60)

/** Offset para paginación: >= 0 */
const offset = z.coerce
  .number()
  .int()
  .min(0, 'Offset no puede ser negativo')
  .optional()
  .default(0)

// ── /api/search ─────────────────────────────────────────────────────

export const searchSchema = z.object({
  q: safeQuery
})

// ── /api/binder ─────────────────────────────────────────────────────

export const binderSchema = z.object({
  binderId: uuid.optional(),
  all: z
    .enum(['0', '1'])
    .optional()
    .default('0')
})

// ── /api/public/explore ─────────────────────────────────────────────

export const exploreSchema = z.object({
  view: z.enum(['cards', 'binders']).optional().default('cards'),
  mode: z.enum(['all', 'for_sale', 'for_trade']).optional().default('all'),
  q: safeQuery,
  set: safeQuery,
  rarity: safeQuery,
  variant: safeQuery,
  city: safeQuery,
  type: safeQuery,
  language: z
    .enum(['', 'ES', 'EN', 'JP', 'KO', 'ZH'])
    .optional()
    .default(''),
  sort: z
    .enum(['recent', 'price_asc', 'price_desc', 'name'])
    .optional()
    .default('recent'),
  minPrice: z.coerce
    .number()
    .min(0, 'Precio mínimo no puede ser negativo')
    .optional()
    .default(0),
  maxPrice: z.coerce
    .number()
    .min(0, 'Precio máximo no puede ser negativo')
    .optional()
    .default(0),
  limit,
  offset
})

// ── /api/public/wantlist ────────────────────────────────────────────

export const wantlistSchema = z.object({
  q: safeQuery,
  type: safeQuery,
  city: safeQuery,
  limit,
  offset
})

// ── /api/offers ─────────────────────────────────────────────────────

export const offersSchema = z.object({
  inbox: z.enum(['received', 'sent']).optional().default('received')
})

// ── /api/matchmaking ────────────────────────────────────────────────

export const matchmakingSchema = z.object({
  sellerId: uuid
})

// ── /api/public/price ───────────────────────────────────────────────

export const priceSchema = z.object({
  cardId: z.string().min(1, 'cardId requerido').max(50)
})

// ── /api/public/activity ────────────────────────────────────────────

export const activitySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(24)
})

// ── /api/wantlist (POST body) ───────────────────────────────────────

export const createWantlistSchema = z.object({
  card_id: z.string().min(1).max(50),
  card_name: z.string().min(1).max(200),
  set_id: z.string().min(1).max(50),
  set_name: z.string().max(200).optional(),
  number: z.string().min(1).max(20),
  image: z.string().url().optional().nullable()
})

// ── /api/binder (POST body: reorder) ────────────────────────────────

export const reorderSlotsSchema = z.object({
  binderId: uuid,
  slotIds: z.array(uuid).max(81, 'Máximo 81 slots por binder')
})
