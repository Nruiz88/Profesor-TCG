import { formatCondition } from '@/lib/cardCondition'

// Color por grado (nomenclatura estándar). Valores legacy (texto libre)
// quedan en tono neutro.
const GRADE_COLOR: Record<string, string> = {
  M: 'text-emerald-300',
  NM: 'text-emerald-300',
  EX: 'text-teal-300',
  VG: 'text-amber-300',
  GD: 'text-orange-300',
  PL: 'text-orange-300',
  PO: 'text-red-400'
}

// Badge sutil del estado físico de la copia (ej: "NM"). pointer-events-none
// para no interceptar los clics sobre la carta.
export default function ConditionBadge({
  condition,
  className = ''
}: {
  condition?: string | null
  className?: string
}) {
  if (!condition) return null
  const id = String(condition).toUpperCase()
  const label = formatCondition(condition)
  if (!label) return null

  return (
    <span
      title={`Estado: ${label}`}
      className={`pointer-events-none inline-flex items-center rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-white/15 backdrop-blur-sm ${
        GRADE_COLOR[id] ?? 'text-slate-200'
      } ${className}`}
    >
      {id}
    </span>
  )
}