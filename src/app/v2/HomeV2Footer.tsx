import Link from 'next/link'
import { ChatIcon, DiscordIcon, InstagramIcon } from '@/components/icons'
import './HomeV2Footer.css'

/** Footer de la Home V2: módulo aparte con su propio CSS. */
export default function HomeV2Footer() {
  return (
    <footer className="v2ft-root">
      <div className="v2ft-grid">
        {/* Marca */}
        <div>
          <div className="v2ft-brand">
            <img src="/brand/logo-invertido.png" alt="TCG Claim" className="v2ft-logo" />
            <span className="v2ft-brand-name">TCG Claim</span>
          </div>
          <p className="v2ft-desc">
            Tu colección TCG en 3D, tu mercado en WhatsApp. Comprá, vendé y cambiá con
            coleccionistas.
          </p>
        </div>

        {/* Producto */}
        <div>
          <h3 className="v2ft-title">Producto</h3>
          <ul className="v2ft-list">
            <li>
              <Link href="/" className="v2ft-link">
                Mercado
              </Link>
            </li>
            <li>
              <Link href="/login" className="v2ft-link">
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/login" className="v2ft-link">
                Ingresar
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="v2ft-title">Legal</h3>
          <ul className="v2ft-list">
            <li>
              <Link href="/terminos" className="v2ft-link">
                Términos de uso
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="v2ft-link">
                Política de privacidad
              </Link>
            </li>
          </ul>
        </div>

        {/* Comunidad */}
        <div>
          <h3 className="v2ft-title">Comunidad</h3>
          <ul className="v2ft-list">
            <li>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="v2ft-link"
              >
                <ChatIcon width={15} height={15} /> WhatsApp
              </a>
            </li>
            <li>
              <a
                href="https://discord.gg/NxuWmFKPuZ"
                target="_blank"
                rel="noopener noreferrer"
                className="v2ft-link"
              >
                <DiscordIcon width={15} height={15} /> Discord
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/tcgclaim"
                target="_blank"
                rel="noopener noreferrer"
                className="v2ft-link"
              >
                <InstagramIcon width={15} height={15} /> Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="v2ft-bottom">
        © {new Date().getFullYear()} TCG Claim · Hecho con ❤️ para coleccionistas
      </div>
    </footer>
  )
}