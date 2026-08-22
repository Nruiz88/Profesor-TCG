'use client'

import { useEffect, useState } from 'react'

/**
 * Botón de instalación PWA usando beforeinstallprompt (Chrome/Edge Android).
 * Solo se muestra cuando el navegador declara la app instalable y aún no está
 * instalada. Se oculta al instalarse (evento appinstalled) o si ya corre en
 * modo standalone (abierta desde el home).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    const standalone = window.matchMedia('(display-mode: standalone)').matches

    if (standalone) {
      setInstalled(true)
      return
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed || !prompt) return null

  const install = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  return (
    <button
      type="button"
      onClick={install}
      className="fixed right-3 top-3 z-40 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-400 lg:bottom-6 lg:right-3 lg:top-auto"
    >
      📲 Instalar app
    </button>
  )
}