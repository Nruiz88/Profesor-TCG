'use client'

// Compatibilidad: `@/lib/supabase/client` ahora es un alias de browser.ts.
// Usa directamente `@/lib/supabase/browser` en código nuevo.

export { createClient } from './browser'