import { describe, expect, it } from 'vitest'
import { pokedexLevel, speciesFromCardName } from './pokedex'

describe('speciesFromCardName', () => {
  it('deja intacto el nombre base', () => {
    expect(speciesFromCardName('Pikachu')).toBe('Pikachu')
    expect(speciesFromCardName('Charizard')).toBe('Charizard')
    expect(speciesFromCardName('Eevee')).toBe('Eevee')
  })

  it('quita los sufijos de forma', () => {
    expect(speciesFromCardName('Charizard ex')).toBe('Charizard')
    expect(speciesFromCardName('Pikachu VMAX')).toBe('Pikachu')
    expect(speciesFromCardName('Pikachu VSTAR')).toBe('Pikachu')
    expect(speciesFromCardName('Pikachu V-UNION')).toBe('Pikachu')
    expect(speciesFromCardName('Pikachu V')).toBe('Pikachu')
    expect(speciesFromCardName('Eevee GX')).toBe('Eevee')
    expect(speciesFromCardName('Absol G LV.X')).toBe('Absol')
    expect(speciesFromCardName('Pikachu BREAK')).toBe('Pikachu')
  })

  it('quita prefijos de forma y regionales', () => {
    expect(speciesFromCardName('Alolan Exeggutor V')).toBe('Exeggutor')
    expect(speciesFromCardName('Galarian Moltres')).toBe('Moltres')
    expect(speciesFromCardName('Dark Alakazam')).toBe('Alakazam')
    expect(speciesFromCardName('Shining Gyarados')).toBe('Gyarados')
    expect(speciesFromCardName('Mega Charizard X ex')).toBe('Charizard')
    expect(speciesFromCardName('Mega Charizard Y ex')).toBe('Charizard')
    expect(speciesFromCardName('M Charizard-EX')).toBe('Charizard')
  })

  it('no rompe nombres que parecen prefijos/sufijos', () => {
    expect(speciesFromCardName('Darkrai')).toBe('Darkrai')
    expect(speciesFromCardName('Mr. Mime')).toBe('Mr. Mime')
    expect(speciesFromCardName('Porygon-Z')).toBe('Porygon Z')
    expect(speciesFromCardName('Type: Null')).toBe('Type: Null')
    expect(speciesFromCardName('Xatu')).toBe('Xatu')
  })
})

describe('pokedexLevel', () => {
  it('devuelve el nivel según el rango de capturas', () => {
    expect(pokedexLevel(0).name).toBe('Entrenador Novato')
    expect(pokedexLevel(9).name).toBe('Entrenador Novato')
    expect(pokedexLevel(10).name).toBe('Entrenador de Pueblo')
    expect(pokedexLevel(24).name).toBe('Entrenador de Pueblo')
    expect(pokedexLevel(25).name).toBe('Entrenador de Ciudad')
    expect(pokedexLevel(49).name).toBe('Entrenador de Ciudad')
    expect(pokedexLevel(50).name).toBe('Líder de Gimnasio')
    expect(pokedexLevel(100).name).toBe('Entrenador Élite')
    expect(pokedexLevel(200).name).toBe('Maestro Pokémon')
    expect(pokedexLevel(400).name).toBe('Leyenda Pokémon')
    expect(pokedexLevel(999).name).toBe('Leyenda Pokémon')
  })
})
