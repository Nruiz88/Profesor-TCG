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

export interface ApiKeyStatus {
  name: string
  label: string
  hint: string
  hasValue: boolean
  preview: string
  /** 'env' = definida por env var (no editable desde el admin) */
  source: 'env' | 'db' | null
  docsUrl?: string
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

  return KNOWN_API_KEYS.map((info) => {
    const envValue = process.env[info.env]
    if (envValue && envValue.trim() !== '') {
      return {
        name: info.name,
        label: info.label,
        hint: info.hint,
        hasValue: true,
        preview: maskApiKey(envValue),
        source: 'env',
        docsUrl: info.docsUrl
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
      docsUrl: info.docsUrl
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
