'use client'

import { useEffect, useRef, useState } from 'react'
import type { SlotCard } from '@/lib/sheets'
import { formatPrice } from '@/lib/priceGuide'
import { effectivePrice } from '@/lib/cardStatus'

interface BinderShareModalProps {
  binderTitle: string
  cards: SlotCard[]
  username: string | null
  binderUrl: string
  onClose: () => void
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

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const proxyUrl = `/api/public/card-image?src=${encodeURIComponent(url)}`
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

function drawBinderImage(
  canvas: HTMLCanvasElement,
  opts: {
    title: string
    cards: { image: HTMLImageElement | null; name: string; price: number | null; currency: string }[]
    username: string | null
  }
): boolean {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const W = 1080
  const cols = 3
  const rows = Math.ceil(Math.max(opts.cards.length, 9) / cols)
  const headerH = 180
  const footerH = 80
  const gap = 16
  const cardPadding = 20
  const gridW = W - cardPadding * 2
  const cellW = Math.floor((gridW - gap * (cols - 1)) / cols)
  const cellH = Math.round((cellW * 88) / 63)
  const gridH = rows * cellH + (rows - 1) * gap
  const H = headerH + gridH + cardPadding * 2 + footerH

  canvas.width = W
  canvas.height = H

  // Fondo
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#090d16')
  bg.addColorStop(0.5, '#0f1423')
  bg.addColorStop(1, '#1a1535')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Glow decorativo
  const glow = ctx.createRadialGradient(W / 2, headerH / 2, 50, W / 2, headerH / 2, 500)
  glow.addColorStop(0, 'rgba(244, 63, 94, 0.12)')
  glow.addColorStop(1, 'rgba(244, 63, 94, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, headerH)

  // Título
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 52px system-ui, -apple-system, sans-serif'
  const titleLines: string[] = []
  const words = opts.title.split(/\s+/)
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > W - 80 && line) {
      titleLines.push(line)
      line = w
      if (titleLines.length === 1) break
    } else {
      line = test
    }
  }
  if (line) titleLines.push(line)
  const titleY = 70
  titleLines.forEach((l, i) => {
    ctx.fillText(l, W / 2, titleY + i * 58)
  })

  // Subtítulo: contador
  ctx.fillStyle = '#94a3b8'
  ctx.font = '600 26px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    `${opts.cards.length} carta${opts.cards.length !== 1 ? 's' : ''}`,
    W / 2,
    titleY + titleLines.length * 58 + 10
  )

  // Grid de cartas
  const gridStartY = headerH
  const totalValue = opts.cards.reduce((s, c) => s + (c.price ?? 0), 0)

  for (let i = 0; i < opts.cards.length; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = cardPadding + col * (cellW + gap)
    const y = gridStartY + row * (cellH + gap)
    const c = opts.cards[i]

    // Fondo de celda
    roundedRect(ctx, x, y, cellW, cellH, 14)
    ctx.fillStyle = '#1e293b'
    ctx.fill()

    if (c.image) {
      ctx.save()
      roundedRect(ctx, x, y, cellW, cellH, 14)
      ctx.clip()
      try {
        ctx.drawImage(c.image, x, y, cellW, cellH)
      } catch {
        // drawImage puede fallar con imágenes cross-origin
      }
      ctx.restore()
    }

    // Borde sutil
    roundedRect(ctx, x, y, cellW, cellH, 14)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Badge de precio (si tiene)
    if (c.price != null && c.price > 0) {
      const priceText = formatPrice(c.price, c.currency)
      ctx.font = '700 16px system-ui, sans-serif'
      const pw = ctx.measureText(priceText).width + 16
      const px = x + 8
      const py = y + cellH - 32
      roundedRect(ctx, px, py, pw, 24, 12)
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fill()
      ctx.fillStyle = '#fbbf24'
      ctx.textAlign = 'left'
      ctx.fillText(priceText, px + 8, py + 17)
      ctx.textAlign = 'center'
    }
  }

  // Footer: valor total + marca de agua
  const footerY = gridStartY + gridH + cardPadding
  ctx.fillStyle = '#10b981'
  ctx.font = '800 36px system-ui, -apple-system, sans-serif'
  ctx.fillText(
    totalValue > 0 ? `Valor total: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD` : '',
    W / 2,
    footerY + 30
  )
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)'
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillText(
    opts.username ? `Profesor TCG · @${opts.username}` : 'Profesor TCG',
    W / 2,
    H - 30
  )

  return true
}

export default function BinderShareModal({
  binderTitle,
  cards,
  username,
  binderUrl,
  onClose
}: BinderShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function generate() {
      const canvas = canvasRef.current
      if (!canvas) return

      // Cargar imágenes de las primeras 12 cartas (max grid 4x3)
      const limited = cards.slice(0, 12)
      const images = await Promise.all(
        limited.map(async (c) => {
          if (!c.image || c.image.startsWith('data:')) return null
          return loadImage(c.image)
        })
      )

      if (!active) return

      const items = limited.map((c, i) => ({
        image: images[i],
        name: c.card_name,
        price: effectivePrice(c.market_price, c.price_override, c.price, c.manual_price),
        currency: c.currency ?? 'USD'
      }))

      const ok = drawBinderImage(canvas, {
        title: binderTitle,
        cards: items,
        username,
      })

      if (!ok) {
        setState('error')
        return
      }

      try {
        const url = canvas.toDataURL('image/png')
        setImageUrl(url)
        setState('ready')
      } catch {
        setState('error')
      }
    }
    generate()
    return () => { active = false }
  }, [binderTitle, cards, username])

  function download() {
    if (!imageUrl) return
    const a = document.createElement('a')
    const safe = binderTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    a.href = imageUrl
    a.download = `${safe}-binder.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function share() {
    if (!imageUrl) return
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    const safe = binderTitle.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const file = new File([blob], `${safe}-binder.png`, { type: 'image/png' })
    const shareText = `📚 ${binderTitle} — ${cards.length} cartas\n${binderUrl}`

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: binderTitle,
          text: shareText,
          files: [file]
        })
        return
      } catch { /* cancelado */ }
    }
    // Fallback: WhatsApp
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  }

  return (
    <div className="modal-overlay z-[60]" onClick={onClose}>
      <div
        className="modal-card modal-card--lg modal-card--scroll max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Compartir binder"
      >
        <div className="modal-header">
          <h2 className="modal-title">📤 Compartir Binder</h2>
          <button onClick={onClose} className="modal-close">Cerrar</button>
        </div>

        <p className="mt-1 truncate text-sm text-slate-500">
          {binderTitle} · {cards.length} carta{cards.length !== 1 ? 's' : ''}
        </p>

        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-4">
          {state === 'loading' && (
            <div className="flex aspect-[1/1.2] items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-500">
              Generando imagen del binder…
            </div>
          )}
          {state === 'ready' && imageUrl && (
            <>
              <img
                src={imageUrl}
                alt={`Binder: ${binderTitle}`}
                className="w-full rounded-xl border border-slate-800"
              />
              <div className="mt-3 flex gap-2">
                <button onClick={share} className="btn-claim btn-claim--emerald flex-1">
                  📤 Compartir imagen
                </button>
                <button onClick={download} className="btn-claim btn-claim--accent flex-1">
                  ⬇️ Descargar
                </button>
              </div>
            </>
          )}
          {state === 'error' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-center text-sm text-amber-300">
              No se pudo generar la imagen. Probá compartiendo el link directamente.
            </div>
          )}
        </div>

        {/* Link rápido */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Link del binder</p>
          <p className="mt-1 truncate text-xs text-slate-400">{binderUrl}</p>
        </div>
      </div>
    </div>
  )
}
