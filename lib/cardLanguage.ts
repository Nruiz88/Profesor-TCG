// Idioma de la copia física de una carta (código ISO 639-1-ish propio del TCG)
export type CardLanguage = 'ES' | 'EN' | 'JP' | 'KO' | 'ZH'

export const CARD_LANGUAGES: CardLanguage[] = ['ES', 'EN', 'JP', 'KO', 'ZH']

export const CARD_LANGUAGE_META: Record<
  CardLanguage,
  { label: string; flag: string }
> = {
  ES: { label: 'Español', flag: '🇪🇸' },
  EN: { label: 'Inglés', flag: '🇺🇸' },
  JP: { label: 'Japonés', flag: '🇯🇵' },
  KO: { label: 'Coreano', flag: '🇰🇷' },
  ZH: { label: 'Chino', flag: '🇨🇳' }
}

export function isCardLanguage(value: unknown): value is CardLanguage {
  return typeof value === 'string' && value in CARD_LANGUAGE_META
}

// Normaliza cualquier valor (null, vacío, desconocido) a un idioma válido
export function normalizeLanguage(value: unknown): CardLanguage {
  return isCardLanguage(value) ? value : 'ES'
}
