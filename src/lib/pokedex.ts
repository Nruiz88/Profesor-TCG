// ============================================================================
// Pokédex del usuario: cuántas especies de Pokémon distintas tiene en sus
// binders. 100% cosmético por ahora: no da nada, solo se luce en el perfil
// público ("capturé 47 Pokémon"). Lógica pura, sin FS ni red: testeable.
// ============================================================================

export interface PokedexLevel {
  min: number
  icon: string
  name: string
}

export const POKEDEX_LEVELS: PokedexLevel[] = [
  { min: 0, icon: '🟤', name: 'Entrenador Novato' },
  { min: 10, icon: '🟡', name: 'Entrenador de Pueblo' },
  { min: 25, icon: '🟢', name: 'Entrenador de Ciudad' },
  { min: 50, icon: '🔵', name: 'Líder de Gimnasio' },
  { min: 100, icon: '🟣', name: 'Entrenador Élite' },
  { min: 200, icon: '🔴', name: 'Maestro Pokémon' },
  { min: 400, icon: '⚪', name: 'Leyenda Pokémon' }
]

/** Nivel según la cantidad de especies capturadas (rango máximo que alcanza). */
export function pokedexLevel(captured: number): PokedexLevel {
  let level = POKEDEX_LEVELS[0]
  for (const l of POKEDEX_LEVELS) {
    if (captured >= l.min) level = l
  }
  return level
}

// Prefijos de forma/región que distinguen cartas de una misma especie.
const PREFIXES = [
  'Mega',
  'M',
  'Gigantamax',
  'Dark',
  'Shining',
  'Radiant',
  'Alolan',
  'Galarian',
  'Hisuian',
  'Paldean',
  "Team Rocket's",
  "Rocket's",
  'Light',
  'Crystal'
]

// Sufijos de forma/rareza: "Charizard ex", "Pikachu VMAX", "Absol G LV.X"…
// Orden importa: V-UNION/VMAX/VSTAR antes que V, LV.X antes que G.
const SUFFIXES = [
  'ex',
  'EX',
  'GX',
  'V-UNION',
  'V UNION',
  'VMAX',
  'VSTAR',
  'V',
  'BREAK',
  'LV.X',
  'Lv.X',
  'Tera',
  'Prism Star',
  'δ',
  '★',
  '☆',
  'G',
  'Prime',
  'Star',
  'LEGEND'
]

/**
 * Normaliza el nombre de una carta al nombre de la especie Pokémon.
 * Ejemplos: "Charizard ex" → Charizard · "Mega Charizard X ex" → Charizard ·
 * "Alolan Exeggutor V" → Exeggutor · "Dark Alakazam" → Alakazam ·
 * "Absol G LV.X" → Absol.
 */
export function speciesFromCardName(name: string): string {
  let s = name.trim().replace(/-/g, ' ')

  // Prefijos de forma (una sola vez): "Mega Charizard X ex" → "Charizard X ex"
  for (const p of PREFIXES) {
    if (s.toUpperCase().startsWith(p.toUpperCase() + ' ')) {
      s = s.slice(p.length).trim()
      break
    }
  }

  // Sufijos de forma, en bucle: "Charizard X ex" → "Charizard X" → "Charizard"
  let changed = true
  while (changed) {
    changed = false
    for (const suf of SUFFIXES) {
      const upper = s.toUpperCase()
      if (upper.length > suf.length && upper.endsWith(' ' + suf.toUpperCase())) {
        s = s.slice(0, -(suf.length + 1)).trim()
        changed = true
        break
      }
    }
  }

  // Mega con forma X/Y: "Mega Charizard X ex" → "Charizard X" → "Charizard"
  s = s.replace(/\s+[XY]$/, '')
  return s.trim()
}
