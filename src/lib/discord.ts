// Envío de notificaciones a un canal de Discord vía webhook.
// La URL del webhook vive en la variable de entorno DISCORD_WEBHOOK_URL
// (contiene un token, por eso no se hardcodea en el código).

export interface DiscordWebhookMessage {
  content?: string
  username?: string
  embeds?: Array<{
    title?: string
    description?: string
    url?: string
    color?: number
    fields?: Array<{ name: string; value: string; inline?: boolean }>
    timestamp?: string
  }>
}

// Envía un mensaje al webhook de Discord. Es best-effort: un fallo acá nunca
// debe romper el flujo principal de la app.
export async function sendDiscordWebhook(
  payload: DiscordWebhookMessage
): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url) return false

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return res.ok
  } catch {
    return false
  }
}
