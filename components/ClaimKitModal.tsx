'use client'

import { useEffect, useRef, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import { binderSlotUrl, claimPrice, sellerKitText } from '@/lib/claim'
import type { Availability } from '@/lib/cardStatus'

interface ClaimKitModalProps {
  card: SlotCard
  username: string | null | undefined
  price?: number | null
  onClose: () => void
}

type Tab = 'texto' | 'imagen'

// Chip de disponibilidad para la imagen
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

// Texto con wrap por palabras y líneas máximas
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
  const W = 1080
  const H = 1080
  canvas.width = W
  canvas.height = H

  // Fondo: gradiente oscuro con glow índigo
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b0f1e')
  bg.addColorStop(0.55, '#151a33')
  bg.addColorStop(1, '#241d4d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Glow central
  const glow = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700)
  glow.addColorStop(0, 'rgba(99, 102, 241, 0.22)')
  glow.addColorStop(1, 'rgba(99, 102, 241, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Título: nombre + set/número
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 58px system-ui, -apple-system, sans-serif'
  const titleLines = wrapText(ctx, opts.cardName, 960, 2)
  const titleY = 110
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleY + i * 66)
  })
  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 30px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    `${opts.setId.toUpperCase()} · #${opts.number}`,
    W / 2,
    titleY + titleLines.length * 66 + 34
  )

  // Carta: centrada, proporción 63:88
  const cardH = 620
  const cardW = Math.round((cardH * 63) / 88)
  const cardX = (W - cardW) / 2
  const cardY = 250

  // Sombra de la carta
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 18
  if (opts.image) {
    roundedRect(ctx, cardX, cardY, cardW, cardH, 22)
    ctx.clip()
    ctx.drawImage(opts.image, cardX, cardY, cardW, cardH)
  } else {
    roundedRect(ctx, cardX, cardY, cardW, cardH, 22)
    ctx.fillStyle = '#1e293b'
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.font = '700 28px system-ui, sans-serif'
    ctx.fillText('Sin imagen', W / 2, cardY + cardH / 2)
  }
  ctx.restore()

  // Borde de la carta
  roundedRect(ctx, cardX, cardY, cardW, cardH, 22)
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 4
  ctx.stroke()

  // Chip de disponibilidad (sobre la carta, arriba)
  const chipText = availabilityChip(opts.availability)
  ctx.font = '700 26px system-ui, sans-serif'
  const chipW = ctx.measureText(chipText).width + 48
  const chipX = cardX + 14
  const chipY = cardY + 14
  ctx.save()
  roundedRect(ctx, chipX, chipY, chipW, 54, 27)
  ctx.fillStyle = 'rgba(16, 185, 129, 0.92)'
  ctx.fill()
  ctx.fillStyle = '#052e16'
  ctx.textAlign = 'left'
  ctx.fillText(chipText, chipX + 24, chipY + 36)
  ctx.restore()

  // Barra inferior: precio destacado + condición
  const barY = cardY + cardH + 46
  const price = opts.price
  ctx.textAlign = 'center'
  ctx.fillStyle = '#10b981'
  ctx.font = '800 56px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    price != null ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : 'CONSULTAR PRECIO',
    W / 2,
    barY + 58
  )
  if (opts.condition) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillText(`Estado: ${opts.condition}`, W / 2, barY + 100)
  }

  // Marca de agua
  ctx.fillStyle = 'rgba(148, 163, 184, 0.75)'
  ctx.font = '600 30px system-ui, sans-serif'
  ctx.fillText(
    opts.username ? `Profesor TCG · @${opts.username}` : 'Profesor TCG',
    W / 2,
    H - 48
  )

  return true
}

export default function ClaimKitModal({
  card,
  username,
  price,
  onClose
}: ClaimKitModalProps) {
  const [tab, setTab] = useState<Tab>('texto')
  const [copied, setCopied] = useState(false)
  const [imageState, setImageState] = useState<'generating' | 'ready' | 'error'>('generating')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [availability] = useState<Availability>(() =>
    card.is_for_sale && card.is_for_trade
      ? 'venta_o_cambio'
      : card.is_for_sale
        ? 'solo_venta'
        : 'solo_cambio'
  )

  const effectivePrice = price != null ? price : claimPrice(card)
  const slotUrl = binderSlotUrl(username, card.id)
  const kitText = sellerKitText({
    cardName: card.card_name,
    setId: card.set_id,
    number: card.number,
    price: effectivePrice,
    condition: card.condition,
    binderSlotUrl: slotUrl,
    sellerName: username
  })

  async function copyText() {
    try {
      await navigator.clipboard.writeText(kitText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: seleccionar el textarea
      const ta = document.querySelector<HTMLTextAreaElement>('#kit-text')
      ta?.select()
    }
  }

  // Generar la imagen 1080x1080
  useEffect(() => {
    let active = true
    async function generate() {
      const canvas = canvasRef.current
      if (!canvas) return

      // Cargar la imagen de la carta (con CORS para poder exportar el canvas)
      let image: CanvasImageSource | null = null
      if (!card.image.startsWith('data:')) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = card.image
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject(new Error('no carga'))
          })
          image = img
        } catch {
          image = null
        }
      } else {
        const img = new Image()
        img.src = card.image
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
        image = img
      }

      if (!active) return
      const ok = drawKit(canvas, {
        cardName: card.card_name,
        setId: card.set_id,
        number: card.number,
        price: effectivePrice,
        condition: card.condition ?? null,
        availability,
        username: username ?? null,
        image
      })
      if (!ok) {
        setImageState('error')
        return
      }
      try {
        const url = canvas.toDataURL('image/png')
        setImageUrl(url)
        setImageState('ready')
      } catch {
        // Canvas "tainted" por CORS de la imagen: no se puede exportar
        setImageState('error')
      }
    }
    generate()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  function download() {
    if (!imageUrl) return
    const a = document.createElement('a')
    const safe = `${card.card_name}-${card.set_id}-${card.number}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
    a.href = imageUrl
    a.download = `${safe}-kit.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Kit de claim para ${card.card_name}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">📦 Kit de Claim</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300 transition-colors hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500">
          {card.card_name} · {card.set_id.toUpperCase()} {card.number}
          {effectivePrice != null && (
            <span className="ml-2 font-semibold text-emerald-400">
              ${effectivePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </p>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-xl bg-slate-950 p-1">
          {(
            [
              ['texto', '📋 Texto para WhatsApp'],
              ['imagen', '🖼️ Imagen 1080×1080']
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                tab === t ? 'bg-binder-accent text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* El canvas vive siempre en el DOM (oculto): el efecto de generación
            corre al montar el modal, sin depender de que el tab Imagen esté activo */}
        <canvas ref={canvasRef} className="hidden" width={1080} height={1080} />

        {tab === 'texto' ? (
          <div className="mt-4">
            <textarea
              id="kit-text"
              readOnly
              value={kitText}
              rows={12}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm leading-relaxed text-slate-200 focus:border-binder-accent focus:outline-none"
            />
            <button
              onClick={copyText}
              className={`mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-binder-accent text-white hover:bg-rose-500'
              }`}
            >
              {copied ? '✓ ¡Copiado! Pegalo en tu grupo de WhatsApp' : 'Copiar texto estructurado'}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-600">
              Listo para pegar en chats y grupos: nombre, set, precio y el link a tu Binder 3D.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            {imageState === 'generating' && (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-500">
                Generando imagen…
              </div>
            )}
            {imageState === 'ready' && imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt={`Kit de claim de ${card.card_name}`}
                  className="w-full rounded-xl border border-slate-800"
                />
                <button
                  onClick={download}
                  className="mt-3 w-full rounded-xl bg-binder-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
                >
                  ⬇️ Descargar PNG 1080×1080
                </button>
              </>
            )}
            {imageState === 'error' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-300">
                No se pudo exportar la imagen (el CDN de la carta bloquea el CORS). Probá con el
                texto estructurado, que incluye el link a tu Binder.
              </div>
            )}
            <p className="mt-2 text-center text-[11px] text-slate-600">
              Lista para publicar en Instagram, Facebook o grupos: 1080×1080 con precio y marca de
              agua.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
