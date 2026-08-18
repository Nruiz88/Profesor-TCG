/**
 * Middleware de validación con Zod para API routes de Next.js.
 *
 * Uso:
 *   const params = validate(searchParamsSchema, searchParams)
 *   if (params.error) return params.error  // NextResponse con 400
 *
 * O para body JSON:
 *   const body = await validateJson(createCardSchema, req)
 *   if (body.error) return body.error
 */

import { NextResponse } from 'next/server'
import { type ZodSchema, ZodError } from 'zod'

// ── Respuesta de error ──────────────────────────────────────────────

export function validationError(err: ZodError): NextResponse {
  const issues = err.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message
  }))
  return NextResponse.json(
    { error: 'Parámetros inválidos', details: issues },
    { status: 400 }
  )
}

// ── ValidarSearchParams (URLSearchParams) ────────────────────────────

type ValidationResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: NextResponse }

export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data)
  if (result.success) {
    return { ok: true, data: result.data, error: null }
  }
  return { ok: false, data: null, error: validationError(result.error) }
}

// ── Validar JSON body de un Request ──────────────────────────────────

export async function validateJson<T>(
  schema: ZodSchema<T>,
  req: Request
): Promise<ValidationResult<T>> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return {
      ok: false,
      data: null,
      error: NextResponse.json(
        { error: 'Body inválido: no es JSON' },
        { status: 400 }
      )
    }
  }
  return validate(schema, body)
}

// ── Helper: extraer searchParams de una Request ──────────────────────

export function extractParams(req: Request): Record<string, string> {
  const url = new URL(req.url)
  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}
