import type { SlotCard } from '@/lib/sheets'
import { cardPublicUrl } from '@/lib/claim'
import { formatCondition } from '@/lib/cardCondition'
import type { Availability } from '@/lib/cardStatus'

// Imagen cuadrada para compartir la carta (WhatsApp / copiar).
// 800x800: ~45% menos peso que la 1080x1080 anterior, sin perder legibilidad
// en los previews de WhatsApp.
const SIZE = 800

function availabilityChip(a: Availability): string {
  if (a === 'solo_cambio') return 'ACEPTA CAMBIOS'
  if (a === 'venta_o_cambio') return 'EN VENTA O CAMBIO'
  return 'EN VENTA'
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = w
      if (lines.length === maxLines - 1) break
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, maxLines)
}

function drawKit(
  canvas: HTMLCanvasElement,
  opts: {
    cardName: string
    setId: string
    number: string
    price: number | null
    condition: string | null
    availability: Availability
    username: string | null
    image: CanvasImageSource | null
  }
): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  const W = SIZE
  const H = SIZE
  canvas.width = W
  canvas.height = H

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b0f1e')
  bg.addColorStop(0.55, '#151a33')
  bg.addColorStop(1, '#241d4d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 520)
  glow.addColorStop(0, 'rgba(99, 102, 241, 0.22)')
  glow.addColorStop(1, 'rgba(99, 102, 241, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 42px system-ui, -apple-system, sans-serif'
  const titleLines = wrapText(ctx, opts.cardName, 700, 2)
  const titleY = 82
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleY + i * 48)
  })
  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 22px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    `${opts.setId.toUpperCase()} · #${opts.number}`,
    W / 2,
    titleY + titleLines.length * 48 + 26
  )

  const cardH = 460
  const cardW = Math.round((cardH * 63) / 88)
  const cardX = (W - cardW) / 2
  const cardY = 185

  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 45
  ctx.shadowOffsetY = 14
  if (opts.image) {
    roundedRect(ctx, cardX, cardY, cardW, cardH, 16)
    ctx.clip()
    ctx.drawImage(opts.image, cardX, cardY, cardW, cardH)
  } else {
    roundedRect(ctx, cardX, cardY, cardW, cardH, 16)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.font = '700 20px system-ui, sans-serif'
    ctx.fillText('Sin imagen', W / 2, cardY + cardH / 2)
  }
  ctx.restore()

  roundedRect(ctx, cardX, cardY, cardW, cardH, 16)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 3
  ctx.stroke()

  const chipText = availabilityChip(opts.availability)
  ctx.font = '700 19px system-ui, sans-serif'
  const chipW = ctx.measureText(chipText).width + 36
  const chipX = cardX + 10
  const chipY = cardY + 10
  ctx.save()
  roundedRect(ctx, chipX, chipY, chipW, 40, 20)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.92)'
  ctx.fill()
  ctx.fillStyle = '#052e16'
  ctx.textAlign = 'left'
  ctx.fillText(chipText, chipX + 18, chipY + 27)
  ctx.restore()

  const barY = cardY + cardH + 34
  const price = opts.price
  ctx.textAlign = 'center'
  ctx.fillStyle = '#10b981'
  ctx.font = '800 40px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    price != null
      ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : 'CONSULTAR PRECIO',
    W / 2,
    barY + 42
  )
  if (opts.condition) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 20px system-ui, sans-serif'
    ctx.fillText(`Estado: ${formatCondition(opts.condition) ?? opts.condition}`, W / 2, barY + 74)
  }

  ctx.fillStyle = 'rgba(148, 163, 184, 0.75)'
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.fillText(
    opts.username ? `TCG Claim · @${opts.username}` : 'TCG Claim',
    W / 2,
    H - 36
  )

  return true
}

async function loadCardImage(card: SlotCard): Promise<CanvasImageSource | null> {
  if (card.image.startsWith('data:')) {
    const img = new Image()
    img.src = card.image
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
    })
    return img
  }
  const proxyUrl = `/api/public/card-image?src=${encodeURIComponent(card.image)}`
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = proxyUrl
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('no carga'))
    })
    return img
  } catch {
    return null
  }
}

export interface CardShareImageOptions {
  card: SlotCard
  price: number | null
  availability: Availability
  username: string | null
}

// Genera la imagen 800x800 de la carta como dataURL. Devuelve null si falla.
export async function generateCardShareImage(
  opts: CardShareImageOptions
): Promise<string | null> {
  const canvas = document.createElement('canvas')
  const image = await loadCardImage(opts.card)
  const ok = drawKit(canvas, {
    cardName: opts.card.card_name,
    setId: opts.card.set_id,
    number: opts.card.number,
    price: opts.price,
    condition: opts.card.condition ?? null,
    availability: opts.availability,
    username: opts.username ?? null,
    image
  })
  if (!ok) return null
  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export function cardShareText(card: SlotCard, price: number | null): string {
  const url = cardPublicUrl(card.id, card.card_name)
  const priceLabel =
    price != null
      ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
      : null
  return (
    `✨ ${card.card_name} · ${card.set_id.toUpperCase()} #${card.number}` +
    (priceLabel ? `\n💰 ${priceLabel}` : '') +
    `\n🔗 ${url}`
  )
}
