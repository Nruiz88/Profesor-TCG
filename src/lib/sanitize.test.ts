import { describe, expect, it } from 'vitest'
import {
  sanitizeCardTitle,
  sanitizeComment,
  sanitizePlainText
} from './sanitize'

describe('sanitizePlainText', () => {
  it('elimina bloques de scripts y estilos', () => {
    expect(
      sanitizePlainText('<script>alert(1)</script>Pikachu')
    ).toBe('Pikachu')
    expect(
      sanitizePlainText('a<style>body{display:none}</style>b')
    ).toBe('ab')
  })

  it('elimina etiquetas HTML y contenido tag-like', () => {
    expect(sanitizePlainText('<b>Charizard</b> <img src=x onerror=1>')).toBe('Charizard')
    expect(sanitizePlainText('1 < 2 > 0')).toBe('1 0')
  })

  it('neutraliza entidades maliciosas que encodifican tags', () => {
    expect(sanitizePlainText('&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('')
    expect(sanitizePlainText('&#60;b&#62;x&#60;/b&#62;')).toBe('x')
  })

  it('neutraliza el esquema javascript:', () => {
    expect(sanitizePlainText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('quita caracteres de control y colapsa espacios', () => {
    expect(sanitizePlainText('Hola\n\n  mundo\u0000\u001b')).toBe('Hola mundo')
  })

  it('recorta espacios iniciales y finales', () => {
    expect(sanitizePlainText('   Buenos Aires   ')).toBe('Buenos Aires')
  })

  it('devuelve string vacío para entradas no string', () => {
    expect(sanitizePlainText(null)).toBe('')
    expect(sanitizePlainText(undefined)).toBe('')
    expect(sanitizePlainText(123)).toBe('')
  })
})

describe('sanitizeCardTitle', () => {
  it('conserva caracteres válidos de nombres TCG', () => {
    expect(sanitizeCardTitle('Charizard ex')).toBe('Charizard ex')
    expect(sanitizeCardTitle('Greninja & Zoroark-GX')).toBe('Greninja & Zoroark-GX')
    expect(sanitizeCardTitle('Rare Candy (C 136/167)')).toBe('Rare Candy (C 136/167)')
  })

  it('remueve caracteres no permitidos (incluidos tags)', () => {
    expect(sanitizeCardTitle('<b>Pikachu</b>')).toBe('Pikachu')
    expect(sanitizeCardTitle('Pikachu 😈')).toBe('Pikachu')
    expect(sanitizeCardTitle('Charizard@#^')).toBe('Charizard')
  })

  it('limita la longitud a 80 caracteres', () => {
    const long = 'P'.repeat(200)
    expect(sanitizeCardTitle(long)).toHaveLength(80)
  })

  it('colapsa espacios y recorta', () => {
    expect(sanitizeCardTitle('   Mew   two   ')).toBe('Mew two')
  })

  it('devuelve string vacío para entradas vacías', () => {
    expect(sanitizeCardTitle('')).toBe('')
    expect(sanitizeCardTitle(null)).toBe('')
  })
})

describe('sanitizeComment', () => {
  it('escapa caracteres peligrosos', () => {
    expect(sanitizeComment('<b>vendedor</b> & rápido "ok" \'sí\' y 5 < 3')).toBe(
      'vendedor &amp; rápido &quot;ok&quot; &#39;sí&#39; y 5 &lt; 3'
    )
  })

  it('elimina scripts y tags antes de escapar', () => {
    expect(sanitizeComment('<script>alert(1)</script>Todo bien')).toBe('Todo bien')
    expect(sanitizeComment('<b>Buen vendedor</b>')).toBe('Buen vendedor')
  })

  it('preserva saltos de línea y normaliza blancos', () => {
    expect(sanitizeComment('hola\n\n  mundo')).toBe('hola\n\nmundo')
  })

  it('limita la longitud a 500 caracteres', () => {
    expect(sanitizeComment('a'.repeat(1000))).toHaveLength(500)
  })

  it('devuelve string vacío para entradas no string', () => {
    expect(sanitizeComment(undefined)).toBe('')
    expect(sanitizeComment(null)).toBe('')
  })
})