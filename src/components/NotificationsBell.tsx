'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { AppNotification } from '@/app/api/notifications/route'
import { slugify } from '@/lib/utils'
import { formatPrice } from '@/lib/priceGuide'
import { BellIcon } from '@/components/icons'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days !== 1 ? 's' : ''}`
}

function notificationHref(n: AppNotification): string {
  const p = n.payload as { binder_card_id?: string; card_name?: string }
  if (p.binder_card_id && p.card_name) {
    return `/card/${p.binder_card_id}/${slugify(p.card_name)}`
  }
  return '/explore'
}

function notificationTitle(n: AppNotification): string {
  const p = n.payload as {
    card_name?: string
    set_id?: string
    number?: string
    price?: number | null
    seller_username?: string
    buyer_username?: string
  }
  if (n.type === 'wantlist') {
    const price = p.price != null ? ` a ${formatPrice(p.price, 'USD')}` : ''
    return `🔔 “${p.card_name ?? 'Una carta'}” (${(p.set_id ?? '').toUpperCase()} ${p.number ?? ''}) está en el marketplace${price} — de @${p.seller_username ?? 'coleccionista'}.`
  }
  if (n.type === 'claim') {
    return `📥 @${p.buyer_username ?? 'Alguien'} hizo un claim sobre “${p.card_name ?? 'una carta'}” (${(p.set_id ?? '').toUpperCase()} ${p.number ?? ''}). Quedó reservada 24h — coordiná por WhatsApp.`
  }
  return 'Nueva notificación'
}

/**
 * Campanita de notificaciones del header: badge con las no leídas y dropdown
 * con las últimas (se marcan como leídas al abrir). Se monta en desktop y en
 * mobile (el fetch es liviano).
 */
export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/notifications')
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setNotifications(data.notifications || [])
        setUnread(data.unread ?? 0)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Marcar como leídas al abrir la campanita
  useEffect(() => {
    if (!open || unread === 0) return
    setUnread(0)
    fetch('/api/notifications/read', { method: 'POST' }).catch(() => {})
  }, [open, unread])

  // Cerrar al hacer clic afuera o con Escape
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
      >
        <BellIcon className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#090d16]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Notificaciones
          </p>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              Sin notificaciones por ahora.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={notificationHref(n)}
                  onClick={() => setOpen(false)}
                  className={`block rounded-xl px-3 py-2.5 text-xs leading-relaxed transition-colors hover:bg-white/5 ${
                    n.read ? 'text-slate-400' : 'text-slate-100'
                  }`}
                >
                  {notificationTitle(n)}
                  <span className="mt-0.5 block text-[10px] text-slate-600">
                    {timeAgo(n.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
