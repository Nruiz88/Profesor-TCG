import Link from 'next/link'

export default async function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <main className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-binder-accent">
          Política de privacidad
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          Fecha de última actualización: 16 de agosto de 2026
        </p>

        <div className="mt-10 space-y-9">
          <section>
            <h2 className="text-lg font-semibold text-white">1. Responsable del tratamiento</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Profesor TCG es una plataforma comunitaria para coleccionistas de Pokémon TCG. Esta
              política explica qué datos personales recopilamos, para qué los usamos y qué derechos
              tenés sobre ellos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">2. Datos que recopilamos</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Datos de la cuenta:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Email y contraseña (almacenada de forma encriptada).</li>
              <li>
                Nombre de usuario, ciudad y país, y número de WhatsApp (opcionales, los cargás vos).
              </li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Contenido:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Las cartas de tu binder, sus publicaciones, claims y ofertas de trueque.</li>
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Datos de uso:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>
                Datos técnicos como dirección IP, navegador y páginas visitadas, y un token de
                sesión (cookie) para mantenerte identificado.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">3. Para qué usamos tus datos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>Crear y gestionar tu cuenta y tu binder privado.</li>
              <li>
                Mostrar tus publicaciones en el marketplace de la comunidad (cartas en venta o para
                intercambio).
              </li>
              <li>Permitir los claims y trueques y el contacto directo por WhatsApp.</li>
              <li>Mantener la seguridad de la plataforma y mejorar su funcionamiento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">4. Base legal</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tratamos tus datos sobre la base de tu consentimiento al crear la cuenta y para la
              ejecución del servicio que solicitaste (gestionar tu binder y tus publicaciones).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">5. Con quién compartimos datos</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-400">
              <li>
                <span className="font-medium text-slate-300">La comunidad:</span> lo que publicás
                (perfil público, cartas en venta o para intercambio) es visible para otros
                usuarios del sitio.
              </li>
              <li>
                <span className="font-medium text-slate-300">Proveedores técnicos:</span> el
                alojamiento y la base de datos (por ejemplo, Supabase) y las APIs externas de datos
                de cartas y precios (TCGdex, TCGplayer, Cardmarket) a las que consultamos para
                mostrar el catálogo y los valores de mercado.
              </li>
              <li>
                <span className="font-medium text-slate-300">Nunca vendemos tus datos personales</span>{' '}
                a terceros.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">6. Almacenamiento y seguridad</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tus datos se almacenan en servicios cifrados, las contraseñas se guardan con hash y la
              comunicación con el sitio se realiza por HTTPS. Ningún sistema es 100% seguro: si
              detectamos un incidente que afecte tus datos, te lo comunicaremos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">7. Conservación</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Conservamos tus datos mientras tu cuenta esté activa. Cuando eliminás tu cuenta, se
              borran tus datos personales y el contenido asociado, salvo que la ley exija conservar
              algún registro durante un plazo determinado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">8. Tus derechos</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Tenés derecho a acceder, rectificar, suprimir y portar tus datos, y a oponerte o
              limitar su tratamiento. Podés ejercer estos derechos escribiéndonos por WhatsApp desde
              el footer del sitio. También podés cerrar la sesión y eliminar tu cuenta en cualquier
              momento desde la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">9. Menores de edad</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              El servicio está dirigido a mayores de 16 años (o la edad mínima de consentimiento
              digital vigente en tu país). No recopilamos a sabiendas datos de menores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">10. Cambios en esta política</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Podemos actualizar esta política periódicamente. La versión vigente siempre estará
              publicada en esta página, con su fecha de actualización.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white">11. Contacto</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Si tenés preguntas sobre cómo tratamos tus datos, escribinos por WhatsApp desde el
              footer del sitio o a través de la comunidad en GitHub.
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
