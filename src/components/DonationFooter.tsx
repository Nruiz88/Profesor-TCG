import KofiButton from '@/components/KofiButton'

// Footer reducido para las páginas internas de la app (perfil, binder, claims,
// ofertas, admin, etc.): solo el bloque de donaciones compacto.
export default function DonationFooter() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 pb-24 pt-3 lg:pb-3">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center sm:flex-row sm:justify-center sm:gap-4">
        <p className="max-w-xl text-xs leading-snug text-slate-400">
          TCG Claim es y seguirá siendo <span className="font-semibold text-white">100% gratuito</span>{' '}
          sin comisiones. Si querés ayudarnos, podés invitarnos un café:
        </p>
        <KofiButton />
      </div>
    </footer>
  )
}
