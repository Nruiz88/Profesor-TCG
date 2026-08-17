'use client'

// ============================================================================
// Cliente Supabase de NAVEGADOR (browser.ts).
// Úsalo SOLO para acciones del lado del cliente (event handlers, effects).
// Para Server Components y Server Actions usa lib/supabase/server.ts.
// ============================================================================

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}