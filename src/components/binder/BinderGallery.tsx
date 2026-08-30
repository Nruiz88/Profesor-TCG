'use client'

import { useRouter } from 'next/navigation'
import { binderBackgroundForSheet } from '@/lib/binderBackgrounds'
import type { SidebarBinder } from '@/components/SidebarMenu'

interface BinderGalleryProps {
  binders?: SidebarBinder[]
}

export default function BinderGallery({ binders: bindersProp }: BinderGalleryProps) {
  const router = useRouter()

  if (bindersProp && bindersProp.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-10 text-center backdrop-blur-xl">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex items-center justify-center">
          <span className="text-3xl">📁</span>
        </div>
        <h3 className="text-lg font-bold text-white">No tenés binders</h3>
        <p className="mt-1 text-sm text-slate-500">
          Creá tu primer binder con el botón de arriba.
        </p>
      </div>
    )
  }

  const binders = bindersProp ?? []

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-xl sm:p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 justify-items-center">
        {binders.map((b) => {
          const bgUrl = binderBackgroundForSheet(1, b.background ?? null)
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => router.push(`/binder?binderId=${b.id}`)}
              className="group relative flex w-full max-w-[195px] aspect-[3/4] overflow-hidden rounded-sm text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_35px_rgba(0,255,204,0.25)]"
              aria-label={`Abrir binder ${b.title}`}
              style={{
                boxShadow: '3px 4px 16px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.06)'
              }}
            >
              {/* ── Lomo del libro ── */}
              <div className="absolute left-0 top-0 bottom-0 w-[14px] z-20">
                <div className="h-full w-full bg-gradient-to-r from-[#141822] via-[#1e2435] to-[#141822]" />
                {/* Líneas del lomo - más gruesas y doradas */}
                <div className="absolute inset-0 flex flex-col justify-between py-2 px-0.5">
                  <div className="h-[2px] bg-gradient-to-r from-amber-500 via-amber-400/70 to-transparent rounded-full" />
                  <div className="h-px bg-gradient-to-r from-amber-600/70 via-amber-500/50 to-transparent" />
                  <div className="h-[2px] bg-gradient-to-r from-amber-500 via-amber-400/70 to-transparent rounded-full" />
                </div>
                {/* Borde derecho del lomo */}
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-amber-700/50 via-black/80 to-amber-700/50" />
                {/* Brillo del lomo */}
                <div className="absolute right-1 top-0 bottom-0 w-px bg-gradient-to-b from-white/5 via-white/10 to-white/5" />
              </div>

              {/* ── Portada: fondo del usuario ── */}
              <div
                aria-hidden="true"
                className="absolute inset-0 ml-[14px] bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.04]"
                style={{ backgroundImage: `url(${bgUrl})` }}
              />

              {/* ── Overlay oscuro ── */}
              <div className="absolute inset-0 ml-[14px] bg-gradient-to-t from-black/75 via-transparent to-black/15" />

              {/* ── Borde decorativo tipo Pokemon card - más grueso ── */}
              <div className="absolute inset-0 ml-[14px] z-10 pointer-events-none">
                {/* Borde exterior dorado grueso */}
                <div className="absolute inset-0 border-[2.5px] border-amber-500/50 rounded-sm" />
                {/* Borde interior dorado */}
                <div className="absolute inset-[4px] border-[1.5px] border-amber-400/30 rounded-sm" />

                {/* Esquinas decorativas - más grandes y llamativas */}
                <svg className="absolute top-0.5 left-0.5 h-5 w-5 text-amber-400/70" viewBox="0 0 20 20" fill="none">
                  <path d="M0 0 L10 0 L10 3 L3 3 L3 10 L0 10 Z" fill="currentColor" />
                  <path d="M1 1 L5 1 L5 2 L2 2 L2 5 L1 5 Z" fill="currentColor" opacity="0.5" />
                </svg>
                <svg className="absolute top-0.5 right-0.5 h-5 w-5 text-amber-400/70" viewBox="0 0 20 20" fill="none">
                  <path d="M20 0 L10 0 L10 3 L17 3 L17 10 L20 10 Z" fill="currentColor" />
                  <path d="M19 1 L15 1 L15 2 L18 2 L18 5 L19 5 Z" fill="currentColor" opacity="0.5" />
                </svg>
                <svg className="absolute bottom-0.5 left-0.5 h-5 w-5 text-amber-400/70" viewBox="0 0 20 20" fill="none">
                  <path d="M0 20 L10 20 L10 17 L3 17 L3 10 L0 10 Z" fill="currentColor" />
                  <path d="M1 19 L5 19 L5 18 L2 18 L2 15 L1 15 Z" fill="currentColor" opacity="0.5" />
                </svg>
                <svg className="absolute bottom-0.5 right-0.5 h-5 w-5 text-amber-400/70" viewBox="0 0 20 20" fill="none">
                  <path d="M20 20 L10 20 L10 17 L17 17 L17 10 L20 10 Z" fill="currentColor" />
                  <path d="M19 19 L15 19 L15 18 L18 18 L18 15 L19 15 Z" fill="currentColor" opacity="0.5" />
                </svg>

                {/* Líneas decorativas horizontales - más gruesas */}
                <div className="absolute top-3 left-5 right-5 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />
                <div className="absolute bottom-3 left-5 right-5 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent rounded-full" />

                {/* Líneas verticales decorativas laterales */}
                <div className="absolute top-5 bottom-5 left-3 w-[2px] bg-gradient-to-b from-transparent via-amber-500/20 to-transparent rounded-full" />
              </div>

              {/* ── Pokeball icon más visible ── */}
              <div className="absolute top-2.5 right-2.5 z-10 h-5 w-5 opacity-35 group-hover:opacity-60 transition-opacity duration-300">
                <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="text-amber-300" />
                  <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" className="text-amber-300" />
                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" className="text-amber-300" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" className="text-amber-200" />
                </svg>
              </div>

              {/* ── Título como etiqueta de libro ── */}
              <div className="relative z-10 flex h-full w-full flex-col justify-end p-2 pl-5">
                <div className="bg-black/60 backdrop-blur-md rounded-md px-2.5 py-1.5 inline-flex items-center gap-2 w-fit border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00ffcc] shadow-[0_0_6px_rgba(0,255,204,0.9)]" />
                  <span className="line-clamp-2 text-[11px] font-bold leading-tight text-white drop-shadow-lg">
                    {b.title}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
