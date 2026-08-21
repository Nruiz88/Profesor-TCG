import { DiscordIcon } from '@/components/icons'

interface DiscordBannerProps {
  title?: string
  className?: string
}

export default function DiscordBanner({
  title = '¿No encontrás lo que buscás?',
  className = ''
}: DiscordBannerProps) {
  return (
    <section
      className={`flex flex-col items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-600/15 via-slate-900/60 to-indigo-600/15 px-5 py-4 sm:flex-row ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white">
          <DiscordIcon width={20} height={20} />
        </span>
        <p className="text-sm font-semibold text-white">
          {title}
          <span className="mt-0.5 block text-xs font-normal text-slate-400">
            Preguntá por la carta en la comunidad y coordiná al toque.
          </span>
        </p>
      </div>
      <a
        href="https://discord.gg/NxuWmFKPuZ"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-[#4752c4]"
      >
        <DiscordIcon width={16} height={16} />
        Unirme al Discord
      </a>
    </section>
  )
}