import { CARD_LANGUAGE_META, normalizeLanguage } from '@/lib/cardLanguage'

// Badge sutil del idioma de la copia física de la carta (esquina superior
// izquierda del slot). pointer-events-none para no interceptar los clics.
export default function LanguageBadge({
  language,
  className = ''
}: {
  language?: string | null
  className?: string
}) {
  const lang = normalizeLanguage(language)
  const meta = CARD_LANGUAGE_META[lang]
  return (
    <span
      title={`Idioma: ${meta.label}`}
      className={`pointer-events-none inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-200 shadow-sm ring-1 ring-white/15 backdrop-blur-sm ${className}`}
    >
      <span aria-hidden="true">{meta.flag}</span>
      <span className="hidden sm:inline">{meta.label}</span>
      <span className="sm:hidden">{lang}</span>
    </span>
  )
}
