import KofiButton from '@/components/KofiButton'

// Footer reducido para las páginas internas de la app (perfil, binder, claims,
// ofertas, admin, etc.): solo el bloque de donaciones + copyright.
export default function DonationFooter() {
  return (
    <footer className="border-t border-slate-800/60 bg-slate-950 py-6">
      <div className="mx-auto max-w-6xl px-4 text-center">
        <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-400">
          TCG Claim es y seguirá siendo <span className="font-semibold text-white">100% gratuito</span>{' '}
          sin comisiones. Si querés ayudarnos a mantener los servidores activos y seguir sumando
          funciones, podés invitarnos un café:
        </p>
        <div className="mt-4 flex justify-center">
          <KofiButton />
        </div>
        <p className="mt-6 text-xs text-slate-600">
          © {new Date().getFullYear()} TCG Claim · Hecho con ❤️ para coleccionistas
        </p>
      </div>
    </footer>
  )
}
