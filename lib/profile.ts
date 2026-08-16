export interface Profile {
  id: string
  username: string
  whatsapp_number: string | null
  country: string | null
  city: string | null
  created_at: string
  updated_at: string
}

// WhatsApp: solo dígitos, con código de país (ej: 549299XXXXXXX).
// Largo típico internacional: 8 a 15 dígitos.
export function isValidWhatsApp(value: string): boolean {
  return /^[0-9]{8,15}$/.test(value)
}

// Enlace directo wa.me con el número formateado
export function whatsAppLink(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}`
}

// Ubicación legible: "Neuquén, Argentina" (o solo la parte que exista)
export function formatLocation(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(', ')
}

export function isProfileComplete(profile: Profile | null): boolean {
  return !!profile?.username && !!profile?.whatsapp_number
}
