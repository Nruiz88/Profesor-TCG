'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/utils'

interface FollowButtonProps {
  username: string
  initialFollowing: boolean
  initialFollowers: number
  isOwnProfile: boolean
}

/**
 * Botón de seguidores del perfil público: muestra el contador y permite
 * seguir/dejar de seguir. Usa /api/follow (RLS: solo el seguidor escribe).
 */
export default function FollowButton({
  username,
  initialFollowing,
  initialFollowers,
  isOwnProfile
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(initialFollowers)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFollowing(initialFollowing)
    setFollowers(initialFollowers)
  }, [initialFollowing, initialFollowers])

  if (isOwnProfile) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-slate-300"
        title="No podés seguirte a vos mismo"
      >
        <span aria-hidden="true">👥</span>
        {followers} seguidor{followers !== 1 ? 'es' : ''}
      </span>
    )
  }

  async function toggle() {
    if (busy) return
    setBusy(true)
    try {
      await fetchJson(`/api/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      setFollowing((v) => !v)
      setFollowers((c) => (following ? c - 1 : c + 1))
    } catch {
      // error silencioso: se mantiene el estado previo
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300"
        title={`${followers} seguidor${followers !== 1 ? 'es' : ''}`}
      >
        <span aria-hidden="true">👥</span>
        {followers}
      </span>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 ${
          following
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
        }`}
      >
        {following ? '✓ Siguiendo' : '+ Seguir'}
      </button>
    </span>
  )
}