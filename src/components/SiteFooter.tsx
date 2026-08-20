import Link from 'next/link'
import { ChatIcon, GithubIcon, InstagramIcon } from '@/components/icons'
import KofiButton from '@/components/KofiButton'

export default function SiteFooter() {
  return (
    <footer className="relative z-30 border-t border-slate-800/60 bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <img src="/brand/logo-invertido.png" alt="TCG Claim" className="h-8 w-auto" />
            <span className="text-lg font-bold tracking-tight text-white">TCG Claim</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Tu colección TCG en 3D, tu mercado en WhatsApp. Digitalizá, publicá y comerciá con
            coleccionistas.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Producto</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/explore" className="text-slate-400 transition-colors hover:text-white">
                Marketplace
              </Link>
            </li>
            <li>
              <Link href="/explore" className="text-slate-400 transition-colors hover:text-white">
                Binders destacados
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                Ingresar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Legal</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/terminos" className="text-slate-400 transition-colors hover:text-white">
                Términos de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="text-slate-400 transition-colors hover:text-white">
                Política de privacidad
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Comunidad</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
              >
                <ChatIcon width={15} height={15} /> WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://github.com/Nruiz88/Profesor-TCG"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
              >
                <GithubIcon width={15} height={15} /> GitHub
              </a>
            </li>
            <li>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
              >
                <InstagramIcon width={15} height={15} /> Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800/60 bg-slate-900/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-400">
            TCG Claim es y seguirá siendo <span className="font-semibold text-white">100% gratuito</span>{' '}
            sin comisiones. Si querés ayudarnos a mantener los servidores activos y seguir sumando
            funciones, podés invitarnos un café:
          </p>
          <div className="mt-4 flex justify-center">
            <KofiButton />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800/60 py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} TCG Claim · Hecho con ❤️ para coleccionistas
        </div>
      </div>
    </footer>
  )
}
