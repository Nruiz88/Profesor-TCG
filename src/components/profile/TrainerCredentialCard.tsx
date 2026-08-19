interface TrainerCredentialCardProps {
  username: string
  city: string | null
  country: string | null
  isVerified: boolean
  /** Rango de Entrenador (XP unificada), opcional */
  rank?: { icon: string; name: string } | null
}

/**
 * Tarjeta de Credencial tipo TCG (estilo dashboard ciberpunk): avatar con
 * gradiente neón, username, rol y país/ciudad. El borde usa un gradiente
 * cyan → violeta con glow para el efecto "credencial".
 */
export default function TrainerCredentialCard({
  username,
  city,
  country,
  isVerified,
  rank
}: TrainerCredentialCardProps) {
  const initial = (username[0] ?? '?').toUpperCase()

  return (
    <div className="h-full rounded-3xl bg-gradient-to-br from-[#00ffcc]/70 via-violet-500/60 to-fuchsia-500/70 p-px shadow-[0_0_35px_rgba(0,255,204,0.12)]">
      <div className="relative flex h-full flex-col items-center overflow-hidden rounded-[calc(1.5rem-1px)] bg-[#070a12] p-6">
        {/* Patrón de cuadrícula + glows */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,255,204,0.05)_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#00ffcc]/10 blur-3xl" />

        {/* Header de la credencial */}
        <div className="relative w-full text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-300/70">
            Trainer Card
          </p>
          <h2 className="mt-1 truncate text-lg font-extrabold tracking-tight text-white">
            {username}
          </h2>
        </div>

        {/* Avatar */}
        <div className="relative mt-6">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/30 via-violet-500/30 to-fuchsia-500/30 text-4xl font-black text-white ring-2 ring-cyan-300/40 shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            {initial}
          </div>
          {isVerified && (
            <span
              className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm text-white shadow-lg shadow-emerald-900/50 ring-2 ring-[#070a12]"
              title="Verificado"
            >
              ⚡
            </span>
          )}
        </div>

        {/* Rol */}
        <span className="relative mt-6 inline-flex items-center gap-1.5 rounded-full border border-[#00ffcc]/30 bg-[#00ffcc]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#00ffcc]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ffcc]" />
          Coleccionista
        </span>

        {/* País / ciudad / rango */}
        <div className="relative mt-6 w-full space-y-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
            <span>País</span>
            <span className="font-semibold text-white">{country ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
            <span>Ciudad</span>
            <span className="font-semibold text-white">{city ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Rango</span>
            <span className="font-semibold text-cyan-300">
              {rank ? `${rank.icon} ${rank.name}` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}