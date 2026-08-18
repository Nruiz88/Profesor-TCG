'use client'

import { CARD_LANGUAGES, CARD_LANGUAGE_META, type CardLanguage } from '@/lib/cardLanguage'

interface LanguagePillsProps {
  value: CardLanguage
  onChange: (lang: CardLanguage) => void
  /** Modo compacto: muestra solo bandera + código (ej: 🇪🇸 ES) */
  compact?: boolean
}

// Selector tipo "pill buttons" para elegir el idioma exacto de la copia.
export default function LanguagePills({ value, onChange, compact = false }: LanguagePillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Idioma de la carta">
      {CARD_LANGUAGES.map((lang) => {
        const meta = CARD_LANGUAGE_META[lang]
        const active = value === lang
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lang)}
            className={`rounded-full border py-1.5 text-xs font-semibold transition-colors ${
              compact ? 'px-2' : 'px-3'
            } ${
              active
                ? 'border-binder-accent/60 bg-binder-accent/10 text-binder-accent'
                : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            <span aria-hidden="true">{meta.flag}</span>
            {!compact && <>{' '}{meta.label}</>}
          </button>
        )
      })}
    </div>
  )
}
