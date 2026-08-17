'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileEditForm from './ProfileEditForm'
import PasswordChangeForm from './PasswordChangeForm'
import { createClient } from '@/lib/supabase/client'
import { UserIcon } from '@/components/icons'

// Perfil del usuario logueado tal como llega desde la página (ProfileInfo),
// con los campos que la edición necesita. Estructural, sin acoplar a la vista.
interface SettingsProfile {
  username: string
  whatsapp_number: string | null
  city: string | null
  country: string | null
  created_at?: string
}

interface ProfileSettingsSectionProps {
  profile: SettingsProfile | null
}

// Sección "Configuración" del perfil propio: datos de la cuenta (email, fecha
// de alta), edición del perfil público y cambio de contraseña. Se carga de
// forma lazy desde la página de perfil para mantener liviana la carga inicial.
export default function ProfileSettingsSection({ profile }: ProfileSettingsSectionProps) {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (active && data.user) setEmail(data.user.email ?? null)
      })
      .catch(() => {
        if (active) setEmail(null)
      })
    return () => {
      active = false
    }
  }, [])

  // Después de guardar, refrescamos el server component para que el header
  // del perfil (username, ubicación) muestre los datos nuevos.
  function handleSaved() {
    router.refresh()
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Columna izquierda: cuenta + contraseña */}
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <UserIcon className="h-4 w-4 text-binder-accent" />
            Datos de tu cuenta
          </h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate font-medium text-slate-200">{email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Nombre de usuario</dt>
              <dd className="truncate font-medium text-slate-200">
                @{profile?.username ?? '—'}
              </dd>
            </div>
            {memberSince && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Miembro desde</dt>
                <dd className="font-medium text-slate-200">{memberSince}</dd>
              </div>
            )}
          </dl>
        </section>

        <PasswordChangeForm />
      </div>

      {/* Columna derecha: edición del perfil público */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 backdrop-blur-xl">
        <h3 className="text-sm font-semibold text-white">Editar perfil público</h3>
        <p className="mt-1 text-xs text-slate-500">
          Así te ven otros coleccionistas cuando compartís tu binder.
        </p>
        <div className="mt-4">
          <ProfileEditForm profile={profile} onSaved={handleSaved} />
        </div>
      </section>
    </div>
  )
}
