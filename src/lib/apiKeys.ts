import { createClient as createAdminClient } from '@supabase/supabase-js'

// ============================================================================
// Gestión SEGURA de API keys de integraciones externas.
//
// - Las claves se guardan en la tabla `app_settings` (Supabase), que NO tiene
//   policies de RLS: el cliente (navegador) no puede leerlas ni escribirlas.
// - El acceso es exclusivo del service role (server), y los endpoints que
//   escriben validan `is_admin` antes.
// - El navegador nunca recibe la clave completa: solo una máscara.
// - Si existe la env var (ej: POKEWALLET_API_KEY), tiene prioridad sobre la
//   base (12-factor) — es la opción más segura para producción.
// ============================================================================

export interface ApiKeyInfo {
  name: string
  label: string
  env: string
  hint: string
  /** Validación opcional del formato de la clave (regex sobre el valor) */
  pattern?: RegExp
  patternHint?: string
  docsUrl?: string
}

export const KNOWN_API_KEYS: ApiKeyInfo[] = [
  {
    name: 'pokewallet_api_key',
    label: 'PokeWallet',
    env: 'POKEWALLET_API_KEY',
    hint: 'Clave de la API de precios PokeWallet (pk_live_… o pk_test_…)',
    pattern: /^pk_(live|test)_[A-Za-z0-9_\-]{8,}$/,
    patternHint: 'Debe empezar con pk_live_ o pk_test_',
    docsUrl: 'https://pokewallet.io/api-docs'
  },
  {
    name: 'tcgapi_key',
    label: 'TCG API',
    env: 'TCGAPI_KEY',
    hint: 'Clave de TCG API — precios de 89+ juegos (100 req/día en plan free)',
    pattern: /^[A-Za-z0-9_\-]{16,}$/,
    patternHint: 'Clave alfanumérica de al menos 16 caracteres',
    docsUrl: 'https://tcgapi.dev'
  },
  {
    name: 'poketrace_key',
    label: 'PokéTrace',
    env: 'POKETRACE_API_KEY',
    hint: 'Clave de PokéTrace — precios TCGPlayer + eBay + CardMarket (250 req/día en plan free)',
    pattern: /^[A-Za-z0-9_\-]{16,}$/,
    patternHint: 'Clave alfanumérica de al menos 16 caracteres',
    docsUrl: 'https://poketrace.com/developers'
  }
]

export type ApiKeyName = (typeof KNOWN_API_KEYS)[number]['name']

export function isKnownApiKey(name: string): name is ApiKeyName {
  return KNOWN_API_KEYS.some((k) => k.name === name)
}

export function apiKeyInfo(name: string): ApiKeyInfo | undefined {
  return KNOWN_API_KEYS.find((k) => k.name === name)
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdminClient(url, key) : null
}

// Lee una clave: primero la env var (prioridad), luego la base de datos.
// Nunca se expone al cliente; solo se usa en el servidor.
export async function getApiKey(name: ApiKeyName): Promise<string | null> {
  const info = apiKeyInfo(name)
  const envValue = info ? process.env[info.env] : undefined
  if (envValue && envValue.trim() !== '') return envValue.trim()

  const client = adminClient()
  if (!client) return null
  try {
    const { data, error } = await client
      .from('app_settings')
      .select('value')
      .eq('key', name)
      .maybeSingle()
    if (error) throw error
    return data?.value ?? null
  } catch {
    return null
  }
}

// Máscara para mostrar en el admin sin revelar la clave completa.
export function maskApiKey(value: string): string {
  if (!value) return ''
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`
}

// Mapeo de API key → contador en `integration_usage` (consultas de valor de
// carta por ventana de tiempo). El contador lo escriben las libs de cada
// integración (pokeWallet/pokeTrace/tcgApi) con el service role.
// Cada integración puede tener 1 o 2 ventanas (hora y/o día) según su plan:
//   - PokeWallet: 100/hora y 1000/día
//   - TCG API: 100/hora y 1000/día
//   - PokéTrace: 250/día
const USAGE_CONFIG: Record<
  ApiKeyName,
  {
    integration: string
    windows: Array<{ period: 'hour' | 'day'; label: string; limit: number }>
  }
> = {
  pokewallet_api_key: {
    integration: 'poke_wallet',
    windows: [
      { period: 'hour', label: 'hora', limit: 100 },
      { period: 'day', label: 'día', limit: 1000 }
    ]
  },
  tcgapi_key: {
    integration: 'tcg_api',
    windows: [
      { period: 'hour', label: 'hora', limit: 100 },
      { period: 'day', label: 'día', limit: 1000 }
    ]
  },
  poketrace_key: {
    integration: 'poke_trace',
    windows: [{ period: 'day', label: 'día', limit: 250 }]
  }
}

export interface UsageWindow {
  period: 'hour' | 'day'
  label: string
  used: number
  limit: number
  remaining: number
}

export interface IntegrationUsage {
  /** Consultas de valor de carta en la ventana horaria actual */
  hour: UsageWindow | null
  /** Consultas de valor de carta en la ventana diaria actual */
  day: UsageWindow | null
}

function currentBucket(period: 'hour' | 'day'): string {
  const now = new Date().toISOString()
  return period === 'hour' ? now.slice(0, 13) : now.slice(0, 10)
}

function bucketDate(period: 'hour' | 'day', bucket: string): string {
  return period === 'hour' ? bucket.slice(0, 10) : bucket
}

// Lee el uso persistido de cada integración. Si la tabla no existe o la DB no
// responde, devuelve un mapa vacío (el admin simplemente no muestra el bloque).
async function readUsage(): Promise<Partial<Record<string, IntegrationUsage>>> {
  const client = adminClient()
  if (!client) return {}
  try {
    const integrations = Object.values(USAGE_CONFIG).map((c) => c.integration)
    const { data, error } = await client
      .from('integration_usage')
      .select('integration, bucket, count')
      .in('integration', integrations)
    if (error) throw error

    const usage: Partial<Record<string, IntegrationUsage>> = {}
    for (const [name, config] of Object.entries(USAGE_CONFIG) as [
      ApiKeyName,
      (typeof USAGE_CONFIG)[ApiKeyName]
    ][]) {
      const hour: UsageWindow | null = config.windows.some((w) => w.period === 'hour')
        ? { period: 'hour', label: 'hora', used: 0, limit: 0, remaining: 0 }
        : null
      const day: UsageWindow | null = config.windows.some((w) => w.period === 'day')
        ? { period: 'day', label: 'día', used: 0, limit: 0, remaining: 0 }
        : null
      const hourWindow = config.windows.find((w) => w.period === 'hour')
      const dayWindow = config.windows.find((w) => w.period === 'day')

      // Suma por hora (solo la hora actual) y por día (suma de las horas de hoy)
      for (const row of data ?? []) {
        if (row.integration !== config.integration) continue
        if (hour && hourWindow && row.bucket === currentBucket('hour')) {
          hour.used += row.count
        }
        if (day && dayWindow && bucketDate('hour', row.bucket) === currentBucket('day')) {
          day.used += row.count
        }
      }

      if (hour && hourWindow) {
        hour.limit = hourWindow.limit
        hour.remaining = Math.max(0, hourWindow.limit - hour.used)
      }
      if (day && dayWindow) {
        day.limit = dayWindow.limit
        day.remaining = Math.max(0, dayWindow.limit - day.used)
      }

      usage[config.integration] = { hour, day }
    }
    return usage
  } catch {
    return {}
  }
}

export interface ApiKeyStatus {
  name: string
  label: string
  hint: string
  hasValue: boolean
  preview: string
  /** 'env' = definida por env var (no editable desde el admin) */
  source: 'env' | 'db' | null
  docsUrl?: string
  /** Contador de consultas de valor de carta (null si la tabla no existe) */
  usage: IntegrationUsage | null
}

// Lista de integraciones con su estado (sin exponer las claves).
export async function listApiKeys(): Promise<ApiKeyStatus[]> {
  const client = adminClient()
  let stored = new Map<string, string>()
  if (client) {
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('key, value')
        .in('key', KNOWN_API_KEYS.map((k) => k.name))
      if (!error && data) stored = new Map(data.map((r) => [r.key, r.value]))
    } catch {
      // tabla ausente: las claves quedan solo vía env
    }
  }

  const usage = await readUsage()

  return KNOWN_API_KEYS.map((info) => {
    const usageEntry = usage[USAGE_CONFIG[info.name].integration] ?? null
    const envValue = process.env[info.env]
    if (envValue && envValue.trim() !== '') {
      return {
        name: info.name,
        label: info.label,
        hint: info.hint,
        hasValue: true,
        preview: maskApiKey(envValue),
        source: 'env',
        docsUrl: info.docsUrl,
        usage: usageEntry
      }
    }
    const dbValue = stored.get(info.name)
    return {
      name: info.name,
      label: info.label,
      hint: info.hint,
      hasValue: !!dbValue,
      preview: dbValue ? maskApiKey(dbValue) : '',
      source: dbValue ? 'db' : null,
      docsUrl: info.docsUrl,
      usage: usageEntry
    }
  })
}

// Guarda una clave (solo desde el servidor, tras validar is_admin).
export async function setApiKey(
  name: ApiKeyName,
  value: string,
  updatedBy?: string | null
): Promise<void> {
  const client = adminClient()
  if (!client) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  const { error } = await client.from('app_settings').upsert(
    {
      key: name,
      value: value.trim(),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null
    },
    { onConflict: 'key' }
  )
  if (error) throw error
}

// Elimina una clave almacenada en la base (no afecta env vars).
export async function deleteApiKey(name: ApiKeyName): Promise<void> {
  const client = adminClient()
  if (!client) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  const { error } = await client.from('app_settings').delete().eq('key', name)
  if (error) throw error
}
