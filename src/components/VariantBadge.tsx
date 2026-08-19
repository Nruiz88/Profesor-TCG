const VARIANT_META: Record<string, { label: string; icon: string; color: string }> = {
  normal: { label: 'Normal', icon: '🃏', color: 'text-slate-400' },
  holo: { label: 'Holo', icon: '✨', color: 'text-amber-300' },
  reverse_holo: { label: 'R.Holo', icon: '🔄', color: 'text-sky-300' },
  v: { label: 'Pokémon V', icon: '⚡', color: 'text-violet-300' },
  v_full_art: { label: 'V Full Art', icon: '🖼️', color: 'text-amber-300' },
  v_alternate_art: { label: 'V Alt Art', icon: '🎨', color: 'text-pink-300' },
  vmax: { label: 'VMAX', icon: '💥', color: 'text-red-300' },
  vmax_alternate: { label: 'VMAX Alt', icon: '🌈', color: 'text-fuchsia-300' },
  vstar: { label: 'VSTAR', icon: '⭐', color: 'text-yellow-300' },
  trainer_full_art: { label: 'Trainer FA', icon: '🧑‍🏫', color: 'text-sky-300' },
  rainbow_rare: { label: 'Rainbow', icon: '🌈', color: 'text-fuchsia-300' },
  secret_rare_gold: { label: 'Gold SR', icon: '🥇', color: 'text-yellow-200' }
}

// Badge sutil de la variante de la carta (holo, reverse holo, etc.).
// Se muestra solo cuando la variante NO es "normal" (que es el default).
export default function VariantBadge({
  variant,
  className = ''
}: {
  variant?: string | null
  className?: string
}) {
  const v = variant ?? 'normal'
  if (v === 'normal') return null

  const meta = VARIANT_META[v] ?? { label: v, icon: '🃏', color: 'text-slate-400' }

  return (
    <span
      title={`Variante: ${meta.label}`}
      className={`pointer-events-none inline-flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-white/15 backdrop-blur-sm ${meta.color} ${className}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </span>
  )
}
