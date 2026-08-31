# AGENTS.md — Profesor TCG (Virtual Binder)

> Documento de referencia para agentes de IA. Leer SIEMPRE antes de tocar el proyecto.
> Mantener al día: al agregar/cambiar rutas, componentes, libs, scripts o migraciones, actualizá este archivo.

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript 7
- **Estilos**: Tailwind CSS 4 (clases utilitarias + CSS segmentado por sección en `src/components/*.css`)
- **Base de datos / Auth**: Supabase (PostgreSQL + RLS, `@supabase/ssr`)
- **Datos de cartas**: catálogo local en `src/content/` (345 sets, 37.138 cartas)
- **Tests**: Vitest (`npm test`) · **Typecheck**: `npx tsc --noEmit`
- **UI extras**: `@dnd-kit` (drag & drop), `zod` (validación), `react-markdown`, `@vercel/og` (imágenes OG), PWA (`public/sw.js`)

## Carpetas principales

```
public/                          # Assets estáticos servidos en /...
├─ brand/                        # Logos (logo.png, logo-invertido.png)
├─ binders/backgrounds/          # IMÁGENES DE FONDO DE BINDERS (nueva)
├─ expansions/logos/             # Logos de sets descargados
├─ icons/ · splash/              # Íconos y splashes PWA
└─ vendor/                       # Vendor CSS/íconos (pokemon-cards, pokemon-types)
src/
├─ app/                          # Rutas (App Router) — ver tabla abajo
│  ├─ api/                       # Rutas API (route.ts) — ver tabla abajo
│  ├─ v2/                        # Versión 2 del home (HomeV2.tsx + subcomponentes)
│  ├─ page.tsx                   # Landing (home)
│  ├─ layout.tsx                 # Layout raíz (importa los CSS segmentados)
│  └─ middleware.ts              # (está en src/, no src/app/) protección rutas/sesión
├─ components/                   # UI + CSS segmentado (ver convenciones)
├─ lib/                          # Lógica (ver detalle abajo)
│  ├─ cardImage/                 # Resolución de imágenes de cartas
│  └─ supabase/                  # client.ts / browser.ts / server.ts
├─ content/                      # Catálogo local de cartas
│  ├─ en/ (227 sets) · ja/ (122 sets)
│  └─ sets.json · index.json · lang-map.json · image-manifest.json · binder-backgrounds.json
├─ services/                     # Integraciones (expansions multi-API)
├─ types/                        # Tipos compartidos (card, claim, wantlist, database.types.ts...)
└─ middleware.ts                 # Protección de rutas / sesión
plan.md                          # Hoja de ruta premium (MercadoPago futuro)
supabase/migrations/             # Migraciones 001..026 (ver tabla abajo)
notas/                           # Obsidian local (NO versionado): estructura-proyecto.md, registro-cambios.md
scripts/                         # Scripts de catálogo/assets/PWA (ver tabla)
```

## Rutas principales (src/app/)

| Ruta | Archivo(s) | Propósito |
|------|-----------|-----------|
| `/` | `page.tsx` | Landing (home) |
| `/v2` | `v2/page.tsx`, `v2/HomeV2.tsx` | Home V2 |
| `/explore` | `explore/page.tsx` | Marketplace: cartas en venta/cambio con filtros |
| `/buscados` | `buscados/page.tsx` | Wantlist pública |
| `/binder` | `binder/page.tsx`, `binder/BinderPage.tsx` | Binder propio (CRUD, hojas de 9 bolsillos) |
| `/binder/[username]` | `binder/[username]/page.tsx`, `binder-view.tsx` | Binder público por username |
| `/b/[param]` | `b/[param]/page.tsx`, `binder-view.tsx` | Binder público por id/slug corto |
| `/card/[cardId]/[...slug]` | `card/[cardId]/[...slug]/page.tsx`, `card-view.tsx` | Detalle de carta |
| `/carta/[cardId]/[slug]` | `carta/[cardId]/[slug]/page.tsx` | Detalle de carta (variante) |
| `/especie/[slug]` | `especie/[slug]/page.tsx` | Especie/Pokémon |
| `/expansion/[setId]` | `expansion/[setId]/page.tsx` | Detalle de expansión |
| `/profile/[username]` | `profile/[username]/page.tsx` | Perfil público |
| `/ajustes` | `ajustes/page.tsx` | Ajustes de la cuenta (solo dueño): datos, editar perfil, contraseña |
| `/offers` | `offers/page.tsx`, `offers/OffersPage.tsx` | Ofertas / trueques 1v1 |
| `/claims` | `claims/page.tsx`, `claims/ClaimsPage.tsx` | Claims / reservas |
| `/admin` | `admin/page.tsx`, `admin/AdminPage.tsx` | Panel de administración |
| `/notas/[slug]` | `notas/page.tsx`, `notas/[slug]/page.tsx` | Renderiza notas de Obsidian como páginas web |
| `/login` · `/terminos` · `/privacidad` · `/acerca` · `/offline` | | Páginas estáticas |
| `/c/[shortId]` | `c/[shortId]/page.tsx` | Link corto |

Imágenes OG/dinámicas: `twitter-image.tsx`, `opengraph-image.tsx`, `binder/[username]/opengraph-image.tsx`, `b/[param]/opengraph-image.tsx`, `card/[cardId]/discord-image/route.tsx`, etc.

## APIs (src/app/api/)

- `/api/binder` — CRUD del binder del usuario (GET, PATCH: title, description, is_public, cover_card_id, **background** validado contra premium); `/api/binder/slots` y `/api/binder/slots/[id]` — slots; `/api/binder/update-prices` — refresco de precios; `/api/binder/activity` — actividad del binder
- `/api/public/binder/[binderId]` · `/api/public/binder-by-key/[param]` — binders públicos (devuelven `background`, `is_verified`, `total_sales`, `total_trades`, `review_count`)
- `/api/public/explore` — cards/binders con filtros (q, set, rarity, city, type, min/max price, sort)
- `/api/public/wantlist` · `/api/wantlist` + `/api/wantlist/[id]` — wantlist pública / propia
- `/api/public/price` · `/api/public/card-image` · `/api/public/cards/[id]` · `/api/public/stats` · `/api/public/activity` · `/api/public/by-username/[username]` · `/api/public/exchange-rates`
- `/api/cards/[cardId]` · `/api/sets` + `/api/sets/[setId]` · `/api/search` · `/api/pokedex` — catálogo
- `/api/expansions/[setId]` — detalle de expansión (logo/símbolo multi-fuente)
- `/api/offers` + `/api/offers/[id]` + `/api/offers/count` — trueques; `/api/matchmaking` — matchmaking
- `/api/claims` + `/api/claims/mine` — claims/reservas
- `/api/profile` · `/api/follow` · `/api/reputation/[username]` · `/api/notifications` + `/api/notifications/read`
- `/api/admin/*` — `overview`, `users`, `verify`, `settings`, `premium` (panel admin)

## Componentes clave (src/components/)

- **Navegación**: `ResponsiveNav.tsx` (web+mobile en un solo componente), `MobileNav.tsx`, `SidebarMenu.tsx`, `MarketNav.tsx`, `AppShell.tsx`, `SiteFooter.tsx`, `DonationFooter.tsx`
- **Binder**: `BinderGallery.tsx` (galería estilo libros), `BinderSheet.tsx`, `BinderToolbar.tsx`, `BinderSettingsModal.tsx`, `BinderShareModal.tsx`, `HeroBinderDemo.tsx`; grillas en `src/components/binder/` → `EditableBinderGrid.tsx`, `SortableSlot.tsx`, `WantlistSlot.tsx`, `BinderTabs.tsx`
- **Market**: `MarketGrid.tsx`, `MarketCard.tsx`, `LiveMarketFeed.tsx`, `LiveWantlistFeed.tsx`, `LiveActivityTicker.tsx`, `SellerInfoBadge.tsx`, `SellerReputationCard.tsx`, `PriceInputWithGuide.tsx`
- **Modales**: `CardDetailModal.tsx`, `EditCardModal.tsx`, `ClaimModal.tsx`, `ClaimKitModal.tsx`, `ReviewModal.tsx`, `PokedexSearchModal.tsx`, `MakeTradeOfferModal.tsx`, `TradeFairnessWidget.tsx`, `ProfileRequiredModal.tsx`, `ClaimsPanel.tsx`, `ClaimSimulator.tsx`
- **Cartas**: `PokemonCard.tsx`, `CardStatusBadge.tsx`, `ConditionBadge.tsx`, `VariantBadge.tsx`, `LanguageBadge.tsx`, `LanguagePills.tsx`, `TypeIcon.tsx`, `GhostPokemon.tsx`, `WantlistGrid.tsx`, `SearchResultCard.tsx`, `ExpansionHeader.tsx`
- **CSS segmentado** (importados en `layout.tsx`): `globals.css` (base), `modals.css`, `banners.css`, `buttons.css`, `forms.css`, `marketplace.css`, `claim.css`, `activity.css` — todos dentro de `src/components/`
- **Perfil**: `src/components/profile/` → `UserProfileView.tsx` (vista pública), `ProfileSettingsSection.tsx` (ajustes: cuenta + contraseña + editar perfil), `ProfileEditForm.tsx`, `PasswordChangeForm.tsx`, `TrainerScoreCard.tsx`, `ShowroomCards.tsx`, `FollowButton.tsx`, `SetCollectionCard.tsx`
- Otros: `SWRegister.tsx` (service worker), `InstallPWA.tsx`, `NotificationsBell.tsx`, `ReservedClaimsBanner.tsx`, `RecentActivityTimeline.tsx`, `AdminActivityChart.tsx`, `AdminIntegrations.tsx`, `ProfileHeaderStats.tsx`, `FeaturesStatsBar.tsx`, `CommunityStatsBar.tsx`, `KofiButton.tsx`, `icons.tsx`, `SheetPagination.tsx`

## Lógica (src/lib/)

- **Binder**: `binders.ts`, `binderSlug.ts`, `exploreToSlot.ts`, `normalizeCard.ts`, `binderBackgrounds.ts` (fondos: `BINDER_BACKGROUNDS`, `binderBackgroundForSheet`, `binderBackgroundByKey`)
- **Catálogo**: `catalog.ts`, `catalogPages.ts`, `tcgdexId.ts`, `tcgApi.ts`, `cardLanguage.ts`, `cardCondition.ts`, `cardStatus.ts`, `normalizeCard.ts`
- **Imágenes de cartas**: `cardImage/` → `index.ts` (orquestador), `pokemontcg.ts`, `scrydex.ts`, `tcgdex.ts`, `utils.ts`; más `cardShareImage.ts`, `og.ts`
- **Precios**: `priceGuide.ts`, `priceMatch.ts`, `sheets.ts`
- **Marketplace/claims**: `claim.ts`, `pendingClaim.ts`, `tradeOffers.ts`, `matchmaking.ts`, `reputation.ts`
- **Perfil/usuarios**: `profile.ts`, `trainer.ts`, `follow` (vía API), `notifications.ts`
- **Seguridad**: `schemas.ts` (Zod), `validate.ts`, `sanitize.ts`, `rateLimit.ts`, `apiKeys.ts`
- **Supabase**: `supabase/client.ts`, `supabase/browser.ts`, `supabase/server.ts`
- **Misc**: `utils.ts`, `whatsapp.ts`, `discord.ts`, `pokedex.ts`, `pokeWallet.ts`, `pokeTrace.ts`, `notas.ts`, `splash-links.ts`, `sitemapXml.ts`

## Base de datos (supabase/migrations/)

Migraciones `001`..`026` aplicadas en orden:
- `001` card_prices · `002` profiles · `003` card_status · `004` card_availability · `005` binder_settings · `006` trade_offers · `007` admin · `008` claims · `009` card_language · `010` manual_price · `011` expansions_cache · `012` app_settings · `013` integration_usage · `014` reputation · `015` rls_hardening · `016` wantlist · `017` notifications · `018` followers (+ `favorite_energy`) · `019` binder_featured · `020` card_variant · `021` binder_slug · `022` card_quantity · `023` card_image_cache · `024` search_indexes · `025` binder_background · `026` premium

- **Auth**: email/contraseña vía Supabase Auth. **RLS** en todas las tablas (lectura pública selectiva; escritura solo del dueño).
- `src/types/database.types.ts` → tipos generados de la DB.

## Scripts (scripts/)

| Script | Función |
|--------|---------|
| `fetch-catalog.mjs` | Descarga el catálogo base |
| `fetch-tcgdex-missing.mjs` | Sincroniza sets EN/JA desde TCGdex (`--lang`, `--only-set`) |
| `build-ja-catalog.mjs` | Construye sets JA desde dump `data-asia/` |
| `build-search-index.mjs` | Regenera `index.json` |
| `precompute-images.mjs` | Regenera `image-manifest.json` |
| `fetch-expansion-assets.mjs` / `fetch-set-logos.mjs` | Logos/Assets de expansiones |
| `vendor-pokemon-cards.mjs` / `vendor-pokemon-types.mjs` | Vendors de CSS/íconos |
| `generate-pwa-icons.mjs` / `generate-pwa-splashes.mjs` / `version-sw.mjs` | PWA |
| `fix-market-prices.mjs` | Reparación de precios de mercado |
| `build-binder-backgrounds.mjs` | Genera `src/content/binder-backgrounds.json` desde `public/binders/backgrounds/` |

## Comandos útiles

```bash
npm run dev              # Dev server (Turbopack, puerto 3000)
npm run build            # fetch-catalog + vendor + version-sw + next build
npm run start            # Servir el build
npm test                 # Vitest
npx tsc --noEmit         # Typecheck
# Assets/catálogo:
npm run fetch-expansion-assets   # Logos de sets
npm run precompute-images        # image-manifest.json
node scripts/build-search-index.mjs
```

## Convenciones y notas clave

- **CSS segmentado**: NO meter CSS de secciones en `globals.css`; cada sección tiene su `.css` en `src/components/`.
- **Validación**: toda ruta API valida entrada con Zod (`src/lib/schemas.ts`).
- **fetchJson** en el cliente maneja sesión expirada (redirige a login).
- **Rate limiting** en rutas pesadas (`src/lib/rateLimit.ts`).
- **Middleware** (`src/middleware.ts`) protege `/binder`, `/ajustes`, `/offers`, `/admin` (requieren sesión); redirige a `/login`.
- **Imágenes de cartas**: orden por idioma no-EN → TCGdex localizada → pokemontcg → Scrydex → TCGdex EN; Scrydex devuelve reverso (200) para no encontradas (se valida por hash SHA-256).
- **Fondos de binder**: las imágenes se guardan en `public/binders/backgrounds/` y la lista se genera automáticamente con `scripts/build-binder-backgrounds.mjs` → `src/content/binder-backgrounds.json` (corre en `npm run build`; para regenerar sin build: `node scripts/build-binder-backgrounds.mjs`). La clave elegida se persiste en `binders.background` (migración `025`); el helper `src/lib/binderBackgrounds.ts` expone `BINDER_BACKGROUNDS` (leído del JSON), `binderBackgroundForSheet(sheet, key)` (fondo elegido o rotación por hoja) y `binderBackgroundByKey`. El selector vive en `BinderSettingsModal.tsx` y la hoja lo aplica en `BinderSheet.tsx` / `EditableBinderGrid.tsx`. PATCH `/api/binder` valida contra la lista.
- **Premium** (`profiles.is_premium`, migración `026`): solo los usuarios premium pueden guardar un fondo personalizado. `BinderSettingsModal.tsx` recibe `isPremium` y bloquea la pestaña "Diseño & Fondo" para no-premium (muestra los fondos con badge ★ pero deshabilitados). PATCH `/api/binder` valida `is_premium` server-side (403 si no). El toggle de premium vive en el panel admin (botón ★, API `/api/admin/premium`); al quitar premium se revierten los fondos personalizados a null. Hoja de ruta de pago (MercadoPago futuro) en `plan.md`.
- **Ajustes vs Perfil**: `/profile/[username]` es la vista pública (sin contenido de ajustes). `/ajustes` es la página privada de configuración (datos de cuenta, editar perfil, contraseña) vía `ProfileSettingsSection.tsx`. En la navegación: "Perfil" → `/profile/[username]`, "Configuración" → `/ajustes`.
- **Límite de carpetas**: máximo **12 binders** por usuario (`MAX_BINDERS` en `src/lib/binders.ts`). `createBinder` rechaza al exceder y el botón "Crear nuevo binder" se oculta en `SidebarMenu.tsx` / `ResponsiveNav.tsx` al llegar al límite.
- **Build (Turbopack)**: el acceso dinámico a archivos en `src/lib/catalog.ts` (`path.join(process.cwd(), ...)`, `readdir`) lleva `/*turbopackIgnore: true*/` para que el build de Vercel no falle. Las páginas con `useSearchParams` (ej: `/binder`) deben estar envueltas en `<Suspense>` (CSR bailout).
- **Config local**: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (nunca exponer la service role).
- **Documentación viva**: `notas/estructura-proyecto.md` (Obsidian local, NO versionado). Este AGENTS.md ES la fuente de verdad para agentes.