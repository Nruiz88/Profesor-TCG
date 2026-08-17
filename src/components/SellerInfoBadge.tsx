'use client'

import Link from 'next/link'
import { formatLocation, whatsAppLink } from '@/lib/profile'

export interface SellerInfo {
  id?: string | null
  username: string | null
  whatsapp_number: string | null
  country: string | null
  city: string | null
}

export default function SellerInfoBadge({ seller }: { seller: SellerInfo | null }) {
  if (!seller || !seller.username) return null

  const location = formatLocation(seller.city, seller.country)
  const wa = seller.whatsapp_number

  return (
    <div className="flex w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-binder-accent/15 text-lg font-bold text-binder-accent">
        {(seller.username[0] ?? '?').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          <Link
            href={`/profile/${encodeURIComponent(seller.username)}`}
            className="transition-colors hover:text-rose-300"
            title="Ver perfil público"
          >
            @{seller.username}
          </Link>
        </p>
        <p className="truncate text-xs text-slate-500">{location || 'Ubicación no especificada'}</p>
      </div>
      {wa && (
        <a
          href={whatsAppLink(wa)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Contactar por WhatsApp
        </a>
      )}
    </div>
  )
}
