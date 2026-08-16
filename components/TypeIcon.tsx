// Íconos SVG de tipos (duiker101/pokemon-type-svg-icons) + color de fondo del tipo
// (colores del style.css del repo). Los SVG son blancos, para verse sobre el color.
export const TYPE_ICONS: Record<string, { icon: string; bg: string }> = {
  Grass: { icon: 'grass.svg', bg: '#5FBD58' },
  Fire: { icon: 'fire.svg', bg: '#FBA54C' },
  Water: { icon: 'water.svg', bg: '#539DDF' },
  Lightning: { icon: 'electric.svg', bg: '#F2D94E' },
  Psychic: { icon: 'psychic.svg', bg: '#FA8581' },
  Fighting: { icon: 'fighting.svg', bg: '#D3425F' },
  Darkness: { icon: 'dark.svg', bg: '#595761' },
  Metal: { icon: 'steel.svg', bg: '#5695A3' },
  Fairy: { icon: 'fairy.svg', bg: '#EE90E6' },
  Dragon: { icon: 'dragon.svg', bg: '#0C69C8' },
  Colorless: { icon: 'normal.svg', bg: '#A0A29F' },
  Bug: { icon: 'bug.svg', bg: '#92BC2C' },
  Poison: { icon: 'poison.svg', bg: '#B763CF' },
  Electric: { icon: 'electric.svg', bg: '#F2D94E' },
  Ground: { icon: 'ground.svg', bg: '#DA7C4D' },
  Rock: { icon: 'rock.svg', bg: '#C9BB8A' },
  Ghost: { icon: 'ghost.svg', bg: '#5F6DBC' },
  Ice: { icon: 'ice.svg', bg: '#75D0C1' },
  Flying: { icon: 'flying.svg', bg: '#A1BBEC' },
  Normal: { icon: 'normal.svg', bg: '#A0A29F' }
}

export function TypeIcon({ type, small }: { type: string; small?: boolean }) {
  const meta = TYPE_ICONS[type]
  const size = small ? 'h-4 w-4' : 'h-5 w-5'
  if (!meta) {
    // Tipo desconocido: círculo gris con la inicial
    return (
      <span
        title={type}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-600 text-[9px] font-bold text-white ${size}`}
      >
        {(type[0] ?? '?').toUpperCase()}
      </span>
    )
  }
  return (
    <span
      title={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${size}`}
      style={{ backgroundColor: meta.bg }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/vendor/pokemon-types/${meta.icon}`} alt={type} className="h-[62%] w-[62%]" />
    </span>
  )
}

// Tipos de energía para la fila de filtros del marketplace (Pokédex style):
// id = valor que filtra la API (inglés, como viene del catálogo)
export interface EnergyType {
  id: string
  label: string
  borderClass: string
}

export const ENERGY_TYPES: EnergyType[] = [
  { id: 'Fire', label: 'Fuego', borderClass: 'border-orange-500/40' },
  { id: 'Water', label: 'Agua', borderClass: 'border-blue-500/40' },
  { id: 'Grass', label: 'Planta', borderClass: 'border-green-500/40' },
  { id: 'Lightning', label: 'Eléctrico', borderClass: 'border-yellow-400/40' },
  { id: 'Psychic', label: 'Psíquico', borderClass: 'border-pink-500/40' },
  { id: 'Fighting', label: 'Lucha', borderClass: 'border-red-500/40' },
  { id: 'Darkness', label: 'Siniestro', borderClass: 'border-slate-500/40' },
  { id: 'Metal', label: 'Metal', borderClass: 'border-cyan-500/40' },
  { id: 'Dragon', label: 'Dragón', borderClass: 'border-indigo-500/40' },
  { id: 'Colorless', label: 'Incoloro', borderClass: 'border-slate-400/40' }
]
