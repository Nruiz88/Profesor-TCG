# Plan: Función Premium — Diseño & Fondo de Binder

> Documento de referencia para implementación futura del sistema de premium.
> El bloqueo funcional ya está implementado (migración `026`, overlay UI, validación API).

## Resumen

Los usuarios premium pueden personalizar el fondo de sus binders con imágenes exclusivas. Los usuarios gratuitos usan la rotación automática por defecto.

- **Proveedor de pagos**: MercadoPago
- **Modelo**: Suscripción mensual
- **Alcance actual**: Fondos de binder
- **Alcance futuro**: Funciones premium adicionales

## Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  API Routes  │────▶│    Supabase DB   │
│  (Next.js)  │◀────│  (Next.js)   │◀────│  profiles +      │
│             │     │              │     │  subscriptions   │
└──────┬──────┘     └──────┬───────┘     └─────────────────┘
       │                   │
       │           ┌───────▼────────┐
       └──────────▶│  MercadoPago   │
                   │  Checkout Pro  │
                   │  + Webhooks    │
                   └────────────────┘
```

## Base de datos

### Migración `026` (ya aplicada)

```sql
-- Columna is_premium en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
```

### Migración futura: tabla subscriptions

```sql
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mp_preapproval_id text UNIQUE,
  mp_status text DEFAULT 'pending',       -- authorized, pending, cancelled, paused
  plan_name text DEFAULT 'premium_monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
```

## SDK de MercadoPago

```bash
npm install mercadopago
```

## Variables de entorno (futuras)

```
MP_ACCESS_TOKEN=...
MP_PUBLIC_KEY=...
MP_WEBHOOK_URL=https://tudominio.com/api/webhooks/mercadopago
MP_PLAN_ID=...
NEXT_PUBLIC_MP_PUBLIC_KEY=...
```

## APIs futuras

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/api/subscribe` | POST | Crea preferencia de checkout en MercadoPago |
| `/api/webhooks/mercadopago` | POST | Recibe IPN, actualiza subscriptions y profiles.is_premium |

### `/api/subscribe` (POST)
- Verifica sesión del usuario
- Crea `preapproval` en MercadoPago (plan mensual)
- Guarda registro en `subscriptions` con `mp_status: 'pending'`
- Retorna `{ checkout_url }`

### `/api/webhooks/mercadopago` (POST)
- Valida firma del webhook
- Actualiza `subscriptions.mp_status`
- Pago aprobado → `profiles.is_premium = true`
- Cancelado/expirado → `profiles.is_premium = false`

## Frontend (futuro)

### Componentes nuevos
- `src/components/SubscribeModal.tsx` — Modal de suscripción con Checkout Bricks
- `src/components/PremiumBadge.tsx` — Badge visual de premium

### Cambios en BinderSettingsModal
- Recibe `isPremium: boolean`
- Overlay de premium en pestaña "Diseño & Fondo" cuando no es premium
- Botón "Hacete Premium" que abre SubscribeModal

## Validación server-side (ya implementada)

En `PATCH /api/binder`, antes de guardar un fondo personalizado:
```typescript
if (body.background !== null && body.background !== '') {
  // Verificar is_premium del usuario
  if (!profile?.is_premium) {
    return NextResponse.json({ error: 'Se requiere premium para fondos personalizados' }, { status: 403 })
  }
}
```

## Flujo del usuario (futuro)

```
1. Clic en "Personalizar" → BinderSettingsModal
2. Pestaña "Detalles" → libre
3. Pestaña "Diseño & Fondo" → si no es premium: overlay con candado
4. Botón "Hacete Premium" → SubscribeModal
5. Clic "Suscribirse" → POST /api/subscribe → redirect a MercadoPago
6. Pago exitoso → webhook actualiza DB → is_premium = true
7. Vuelve a la app → pestaña desbloqueada
8. Si pierde premium → fondo revierte a automático
```

## Archivos referenciados

| Archivo | Propósito |
|---------|-----------|
| `src/components/BinderSettingsModal.tsx` | Modal de configuración del binder |
| `src/app/binder/BinderPage.tsx` | Página principal del binder |
| `src/app/api/binder/route.ts` | API CRUD del binder |
| `src/lib/binderBackgrounds.ts` | Helper de fondos |
| `src/lib/premium.ts` | Helper de premium (futuro) |
| `src/types/database.types.ts` | Tipos de la DB |
| `src/lib/profile.ts` | Tipo Profile |
