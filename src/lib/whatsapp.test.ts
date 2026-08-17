import { describe, expect, it } from 'vitest'
import {
  formatWhatsAppMessage,
  generateWhatsAppUrl,
  normalizeWhatsAppLanguage,
  sanitizeWhatsAppPhone,
  sanitizeWhatsAppText
} from './whatsapp'

const baseParams = {
  sellerPhone: '+54 11 2345-6789',
  sellerUsername: 'nacho_tcg',
  cardName: 'Charizard ex',
  setName: 'Obsidian Flames',
  cardNumber: '125/197',
  language: 'ES',
  type: 'claim',
  price: 45,
  currency: 'USD',
  condition: 'Near Mint',
  slotUrl: 'https://profesortcg.app/binder/nacho_tcg?card=abc'
} as const

describe('sanitizeWhatsAppText', () => {
  it('elimina bloques de scripts', () => {
    expect(
      sanitizeWhatsAppText('<script>alert(1)</script>Pikachu')
    ).toBe('Pikachu')
  })

  it('elimina etiquetas HTML y contenido tag-like', () => {
    expect(sanitizeWhatsAppText('<b>Pika</b> <img src=x>')).toBe('Pika')
    expect(sanitizeWhatsAppText('1 < 2 > 0')).toBe('1 0')
  })

  it('neutraliza esquemas javascript:', () => {
    expect(sanitizeWhatsAppText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('quita caracteres de control y colapsa espacios', () => {
    expect(sanitizeWhatsAppText('Hola\n\n  mundo\u0000')).toBe('Hola mundo')
  })

  it('devuelve string vacío para entradas no string', () => {
    expect(sanitizeWhatsAppText(null)).toBe('')
    expect(sanitizeWhatsAppText(undefined)).toBe('')
    expect(sanitizeWhatsAppText(123)).toBe('')
  })
})

describe('sanitizeWhatsAppPhone', () => {
  it('quita espacios, guiones y el +', () => {
    expect(sanitizeWhatsAppPhone('+54 11 2345-6789')).toBe('541123456789')
  })

  it('deja solo dígitos', () => {
    expect(sanitizeWhatsAppPhone('(54) 11-2345 ext 0')).toBe('541123450')
  })
})

describe('normalizeWhatsAppLanguage', () => {
  it('mapea KO (código de la DB) a KR', () => {
    expect(normalizeWhatsAppLanguage('KO')).toBe('KR')
    expect(normalizeWhatsAppLanguage('KR')).toBe('KR')
  })

  it('resuelve códigos válidos y cae a ES en desconocidos', () => {
    expect(normalizeWhatsAppLanguage('EN')).toBe('EN')
    expect(normalizeWhatsAppLanguage('JP')).toBe('JP')
    expect(normalizeWhatsAppLanguage('fr')).toBe('ES')
    expect(normalizeWhatsAppLanguage(null)).toBe('ES')
  })
})

describe('formatWhatsAppMessage', () => {
  it('arma el mensaje de compra (claim) con Markdown nativo', () => {
    const msg = formatWhatsAppMessage(baseParams)
    expect(msg).toContain('¡Hola @nacho_tcg!')
    expect(msg).toContain('*Charizard ex*')
    expect(msg).toContain('por *$45.00*')
    expect(msg).toContain('Set: Obsidian Flames · #125/197')
    expect(msg).toContain('Idioma: Español')
    expect(msg).toContain('Estado: Near Mint')
    expect(msg).toContain('¿Cómo coordinamos el pago y el envío?')
  })

  it('arma el mensaje de intercambio (swap) con la oferta en cursiva', () => {
    const msg = formatWhatsAppMessage({
      ...baseParams,
      type: 'swap',
      offeredCardName: 'Pikachu VMAX'
    })
    expect(msg).toContain('mi _Pikachu VMAX_ por tu *Charizard ex*')
    expect(msg).toContain('¿Qué te parece el intercambio?')
    expect(msg).not.toContain('¿Cómo coordinamos el pago')
  })

  it('sanitiza el contenido embebido', () => {
    const msg = formatWhatsAppMessage({
      ...baseParams,
      cardName: 'Charizard <script>x</script>ex'
    })
    expect(msg).toContain('*Charizard ex*')
    expect(msg).not.toContain('<script>')
  })
})

describe('generateWhatsAppUrl', () => {
  it('genera deep link de escritorio con el número limpio', () => {
    const url = generateWhatsAppUrl(baseParams)
    expect(url).toMatch(/^https:\/\/api\.whatsapp\.com\/send\?phone=541123456789&text=/)
  })

  it('genera deep link nativo en móviles', () => {
    const url = generateWhatsAppUrl(baseParams, true)
    expect(url).toMatch(/^whatsapp:\/\/send\?phone=541123456789&text=/)
  })

  it('codifica el mensaje con encodeURIComponent', () => {
    const url = generateWhatsAppUrl(baseParams)
    expect(url).toContain(encodeURIComponent('¡Hola @nacho_tcg!'))
    expect(url).not.toContain(' ')
  })
})