import type { CardCondition } from '@/types/card'

export type { CardCondition } from '@/types/card'

// Estado físico de la copia de una carta: nomenclaturas estándar del TCG
// (NM = Near Mint, etc.). El id corto se guarda en la base y el label completo
// acompaña la abreviatura en la UI.

export const CARD_CONDITIONS: { id: CardCondition; label: string }[] = [
  { id: 'M', label: 'Mint' },
  { id: 'NM', label: 'Near Mint' },
  { id: 'EX', label: 'Excellent' },
  { id: 'VG', label: 'Very Good' },
  { id: 'GD', label: 'Good' },
  { id: 'PL', label: 'Played' },
  { id: 'PO', label: 'Poor' }
]

export function isCardCondition(value: unknown): value is CardCondition {
  return typeof value === 'string' && CARD_CONDITIONS.some((c) => c.id === value)
}

// Formato legible para mostrar: "NM · Near Mint". Los valores legacy (texto
// libre guardado antes de existir las nomenclaturas) se devuelven tal cual.
export function formatCondition(value: unknown): string | null {
  if (value == null || value === '') return null
  if (isCardCondition(value)) {
    const meta = CARD_CONDITIONS.find((c) => c.id === value)
    return meta ? `${meta.id} · ${meta.label}` : String(value)
  }
  return String(value).slice(0, 40)
}