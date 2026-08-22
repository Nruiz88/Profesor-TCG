# Profesor TCG — Virtual Binder

Gestor de colecciones de Pokémon TCG con precios de mercado en vivo, marketplace y trueques 1v1. Digitalizá tu álbum físico, publicá cartas en venta o intercambio y coordiná por WhatsApp, sin comisiones.

## ✨ Características

- **Binder virtual 3D** — hojas de 9 bolsillos, carpetas por colección, orden arrastrable.
- **Precios de mercado en vivo** — TCGplayer/Cardmarket vía TCGdex, con caché inteligente y actualización en un clic.
- **Catálogo completo** — +37.000 cartas indexadas (345 sets EN/JA). Búsqueda por nombre, número o set.
- **Marketplace** — cartas en venta/cambio con filtros (set, variante, precio, ciudad) y contacto directo por WhatsApp.
- **Trueques 1v1** — ofertas comparando el valor de cada lado, con o sin dinero extra.
- **Perfil público** — portafolio, colección/Master Sets con progreso, reseñas y seguidores.
- **Cartas con efecto holo** — el efecto real de la carta en CSS puro, sin imágenes.
- **Notas del proyecto** — bitácora y documentación renderizadas como páginas web.

## 🚀 Requisitos

- Node.js 18+ (recomendado 20+)
- Un proyecto de [Supabase](https://supabase.com) (PostgreSQL + Auth)

## 🛠️ Instalación

```bash
# 1. Clonar e instalar
git clone https://github.com/Nruiz88/Profesor-TCG.git
cd Profesor-TCG
npm install

# 2. Configurar variables de entorno
# Copiar .env.example a .env.local y completar
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 3. Aplicar el schema y las migraciones en Supabase (SQL Editor)
#   supabase/schema.sql + supabase/migrations/*.sql

# 4. Construir el catálogo de cartas
npm run build

# 5. Levantar el dev server
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## 🔐 Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de service role (solo server, nunca exponer) |

## 📦 Scripts

```bash
npm run dev                 # Dev server
npm run build               # Catálogo + vendor + build de producción
npm run start               # Servir el build
npm test                    # Tests (Vitest)
npx tsc --noEmit            # Typecheck
npx next build              # Solo build

# Catálogo y assets
npm run fetch-catalog       # Descarga el catálogo base
npm run precompute-images   # Regenera image-manifest.json
node scripts/build-search-index.mjs
```

## 🗂️ Estructura del proyecto

```
src/
├─ app/           # Rutas (App Router) y APIs
├─ components/    # UI: navegación responsive, market, profile, binder, modales
├─ lib/           # Lógica: catálogo, imágenes, schemas Zod, Supabase, validación
├─ content/       # Catálogo local (en/ + ja/, sets.json, index.json, manifests)
├─ services/      # Integraciones (expansiones multi-API)
├─ types/         # Tipos compartidos
└─ middleware.ts  # Protección de rutas / sesión
supabase/
└─ migrations/    # Migraciones de schema + RLS
```

> La documentación detallada del proyecto está en `notas/estructura-proyecto.md` (carpeta local de Obsidian, no versionada).

## 🧭 Rutas principales

- `/` — Mercado P2P (ventas + buscadas en solapas) · la landing actual
- `/binder` — Binder propio · `/binder/[username]` — Binder público
- `/profile/[username]` — Perfil público
- `/offers` — Ofertas / trueques
- `/admin` — Panel de administración

## 🗄️ Base de datos (Supabase)

- **Auth**: email/contraseña vía Supabase Auth.
- **RLS**: Row Level Security en todas las tablas (lectura pública selectiva; escritura solo del dueño).
- **Migraciones**: `supabase/migrations/001..018` (cards, profiles, status, offers, claims, reputation, wantlist, notifications, followers, etc.).
- La clave de service role se usa en el server para lecturas que requieren cruzar perfiles.

## 🔒 Seguridad

- Validación de entrada con Zod en todas las rutas API (`src/lib/schemas.ts`).
- `fetchJson` en el cliente detecta sesiones expiradas.
- Rate limiting en rutas pesadas (`src/lib/rateLimit`).
- SQL parametrizado vía Supabase (sin inyección).

## 🤝 Contribuir

1. Hacé un fork del repo.
2. Creá una rama para tu feature (`git checkout -b feat/nombre`).
3. Commit de tus cambios.
4. Abrí un Pull Request.

## 📄 Licencia

Proyecto privado. Pokémon y Pokémon TCG son marcas de The Pokémon Company; los datos de cartas provienen de fuentes públicas (TCGdex, pokemontcg.io, Scrydex) con fines informativos.
