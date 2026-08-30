// Fondos de las hojas del binder.
//
// La lista se genera automáticamente desde public/binders/backgrounds/ por
// `scripts/build-binder-backgrounds.mjs` → src/content/binder-backgrounds.json
// (corre en `npm run build`). Para regenerar sin build:
//   node scripts/build-binder-backgrounds.mjs
//
// Cada fondo tiene una clave (se guarda en binders.background), una URL y un
// nombre amigable para el selector. Las imágenes son 1264x848 (landscape).

export interface BinderBackground {
  key: string
  url: string
  label: string
}

// @ts-ignore — Next.js resuelve JSON imports en build time
import backgroundData from '../content/binder-backgrounds.json'
const BINDER_BACKGROUNDS_DATA = backgroundData as BinderBackground[]

export const BINDER_BACKGROUNDS: BinderBackground[] = BINDER_BACKGROUNDS_DATA

const byKey = new Map(BINDER_BACKGROUNDS.map((b) => [b.key, b]))

/** Resuelve un fondo por su clave (o null si no existe). */
export function binderBackgroundByKey(key: string | null | undefined): BinderBackground | null {
  if (!key) return null
  return byKey.get(key) ?? null
}

/** Devuelve el fondo para una hoja (1-based): el elegido o rotación automática. */
export function binderBackgroundForSheet(
  sheetNumber: number,
  selectedKey?: string | null
): string {
  const selected = binderBackgroundByKey(selectedKey)
  if (selected) return selected.url
  if (BINDER_BACKGROUNDS.length === 0) return ''
  const index = ((sheetNumber - 1) % BINDER_BACKGROUNDS.length + BINDER_BACKGROUNDS.length) % BINDER_BACKGROUNDS.length
  return BINDER_BACKGROUNDS[index].url
}