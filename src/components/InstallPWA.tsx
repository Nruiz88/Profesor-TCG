'use client'

import { useEffect, useState } from 'react'

/**
 * Botón de instalación PWA usando beforeinstallprompt (Chrome/Edge Android).
 * Se muestra cuando el navegador declara la app instalable y aún no está
 * instalada. El usuario puede descartarlo (queda oculto en la sesión).
 * En desktop aparece abajo a la derecha; en mobile, centrado arriba de la
 * barra de navegación inferior.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true)
      return
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const hide = () => {
    setPrompt(null)
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }

  if (installed || dismissed || !prompt) return null

  const install = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    } else {
      setPrompt(null)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6 lg:left-auto lg:right-4 lg:translate-x-0">
      <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-slate-900/95 py-1.5 pl-2 pr-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-base">
          📲
        </span>
        <span className="whitespace-nowrap text-sm font-semibold text-white">
          Instalar TCG Claim
        </span>
        <button
          type="button"
          onClick={install}
          className="rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-400"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={hide}
          aria-label="No mostrar de nuevo"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}