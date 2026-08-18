import Link from 'next/link'
import SiteNav from '@/components/SiteNav'
import { createClient } from '@/lib/supabase/server'

export default async function TerminosPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      {/* Nav */}
      <SiteNav
        initialUser={user ? { id: user.id, email: user.email ?? undefined } : null}
      />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-binder-accent">
          Términos de uso
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Términos y condiciones
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Fecha de última actualización: 16 de agosto de 2026
        </p>

        <div className="mt-10 space-y-9">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Aceptación de los términos</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Al acceder o utilizar Profesor TCG («el servicio», «la plataforma») aceptás estos
              términos y condiciones. Si no estás de acuerdo con alguna parte de ellos, te pedimos
              que no uses el servicio. Al crear una cuenta, confirmás que tenés la edad mínima
              requerida y que aceptás cumplir estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. El servicio</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Profesor TCG es una plataforma para gestionar colecciones de cartas Pokémon TCG en un
              binder virtual: búsqueda del catálogo, precios de mercado en vivo (vía TCGdex,
              TCGplayer y Cardmarket), publicación de cartas en venta o para intercambio,
              reclamos («claim») y trueques 1 a 1, con cierre de las operaciones coordinado entre
              los usuarios.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              El servicio se brinda «tal cual» y «según disponibilidad». Podemos modificar,
              suspender o discontinuar funciones en cualquier momento, con o sin aviso previo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Cuentas de usuario</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Para usar el binder privado y publicar cartas necesitás crear una cuenta con tu email
              y una contraseña. Sos responsable de mantener la confidencialidad de tus credenciales
              y de toda la actividad que ocurra en tu cuenta. Si detectás un uso no autorizado,
              cambiá tu contraseña y contactanos.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Podés dejar de usar el servicio y eliminar tu cuenta en cualquier momento. Al
              eliminarla, se borran tus datos personales y tu binder, conforme a lo indicado en la
              Política de privacidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Uso permitido y conducta</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              El servicio está pensado para uso personal: armar tu colección, publicar tus propias
              cartas y operar con otros coleccionistas. Está prohibido:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Crear cuentas falsas o suplantar a otra persona o entidad.</li>
              <li>Publicar contenido ilegal, ofensivo o que viole derechos de terceros.</li>
              <li>
                Extraer datos de forma automatizada (scraping) que afecte el funcionamiento del
                servicio.
              </li>
              <li>
                Interferir con la plataforma, sus servidores o con la experiencia de otros
                usuarios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Publicaciones y precios</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Las cartas que publicás (en venta o para intercambio) son de tu exclusiva
              responsabilidad: vos definís el precio, la condición y la disponibilidad. Los precios
              de mercado que muestra la plataforma son orientativos, provienen de fuentes externas
              y pueden no coincidir con el valor final de una operación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Operaciones entre usuarios</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Profesor TCG es una herramienta de publicación y contacto: no participa en las
              transacciones, no maneja pagos ni envíos, y no cobra comisiones. La venta, el trueque
              y la entrega se coordinan directamente entre los usuarios (por ejemplo, por
              WhatsApp). La plataforma no garantiza la concreción, la calidad ni la legalidad de las
              operaciones. Operá con precaución y verificá al comprador o vendedor antes de cerrar
              un trato.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Propiedad intelectual</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              El diseño, el código y la marca «Profesor TCG» pertenecen a sus creadores. Pokémon y
              Pokémon TCG son marcas de The Pokémon Company; los datos y nombres de las cartas se
              muestran con fines informativos y provienen de fuentes públicas como TCGdex. Al
              publicar contenido en la plataforma (perfil, binder, publicaciones), nos otorgás una
              licencia limitada para mostrarlo a la comunidad y operar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Limitación de responsabilidad</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              No garantizamos que el servicio esté disponible sin interrupciones ni errores. En la
              máxima medida permitida por la ley, Profesor TCG no será responsable por daños
              directos o indirectos derivados del uso del servicio o de las operaciones realizadas
              entre usuarios.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Suspensión y terminación</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Podemos suspender o eliminar cuentas que violen estos términos, sin perjuicio de otras
              medidas. Si tu cuenta se elimina por una infracción, perderás el acceso a tu binder y
              a tus publicaciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Cambios en los términos</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Podemos actualizar estos términos periódicamente. La versión vigente siempre estará
              publicada en esta página, con su fecha de actualización. El uso continuado del
              servicio tras un cambio implica su aceptación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Contacto</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Si tenés dudas sobre estos términos, podés escribirnos por WhatsApp desde el footer
              del sitio o a través de la comunidad en GitHub.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-800/60 pt-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            ← Volver a la página principal
          </Link>
        </div>
      </main>

    </div>
  )
}
