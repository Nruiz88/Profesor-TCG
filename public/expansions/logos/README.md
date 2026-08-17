# Assets locales de expansiones

Los logos oficiales (alta resolución) se guardan acá como `{setId}.png`
(ej: `sv05.png`, `base1.png`).

El servicio Multi-API (`lib/expansionService.ts`) los usa como **primer
fallback de imágenes**: si el archivo existe, se sirve desde `/expansions/logos/`
en lugar de pegarle al CDN de pokemontcg.io.

## Descargar los assets

```bash
npm run fetch-expansion-assets          # todas las expansiones del catálogo local
npm run fetch-expansion-assets sv05     # solo un set (o varios: sv05 base1)
```

El script baja los logos oficiales desde `images.pokemontcg.io`. Si no se
corre, el servicio cae al CDN automáticamente — los assets locales son
opcionales (offline / estabilidad).
