#!/usr/bin/env node
/**
 * Pre-computa las URLs de imagen para todas las cartas del catálogo.
 *
 * Estrategia eficiente: verifica UNA carta por set contra cada CDN, no todas.
 *   pokemontcg.io → HEAD (404 limpio para cartas que no tiene)
 *   Scrydex       → descarga el body y compara el hash (responde 200 con el
 *                   REVERSO de la carta para las que no tiene)
 *   TCGdex        → serie real del set (tcgp para Pocket, SV/S/SM para JP)
 *                   + HEAD
 *
 * Salida:
 *   src/content/image-manifest.json
 *     { "sv3": "pokemontcg", "me5": "scrydex", "A1": "tcgdex", ... }
 *   src/content/tcgdex-images.json
 *     { "A1": "en/tcgp/A1", "SV1a": "ja/SV/SV1a", ... }
 *
 * Uso: node scripts/precompute-images.mjs
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()
const INDEX_PATH = join(ROOT, 'src', 'content', 'index.json')
const MANIFEST_PATH = join(ROOT, 'src', 'content', 'image-manifest.json')
const TCGDEX_MAP_PATH = join(ROOT, 'src', 'content', 'tcgdex-images.json')
const LANG_MAP_PATH = join(ROOT, 'src', 'content', 'lang-map.json')
const CONCURRENCY = 10
const TIMEOUT = 8000

const SCRYDEX_BACK_SHA =
  'fd7c3800f9b8ebadf4b31a735f569a180e66201741b00fafa17879967884ad2c'

// ── Helpers ──────────────────────────────────────────────────────────

async function head(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(TIMEOUT)
    })
    return res.ok
  } catch {
    return false
  }
}

async function getJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Scrydex responde 200 con el reverso para cartas que no tiene. */
async function scrydexReal(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    return createHash('sha256').update(buf).digest('hex') !== SCRYDEX_BACK_SHA
  } catch {
    return false
  }
}

function unpad(n) {
  return n.replace(/^0+(?=\d)/, '')
}

/**
 * Resuelve el prefijo de imagen TCGdex ("lang/serie/setId") para un set.
 * Consulta la API de TCGdex para obtener la serie real (tcgp, SV, S, ...).
 */
async function resolveTcgdexPrefix(setId, sampleNumber) {
  const langs = ['en', 'ja']
  for (const lang of langs) {
    const set = await getJSON(`https://api.tcgdex.net/v2/${lang}/sets/${setId}`)
    if (!set?.serie?.id || !Array.isArray(set.cards) || set.cards.length === 0) continue
    const card = set.cards.find((c) => c.image) || set.cards[0]
    const localId = card?.localId || sampleNumber
    const url = `https://assets.tcgdex.net/${lang}/${set.serie.id}/${setId}/${localId}/high.png`
    if (await head(url)) {
      return `${lang}/${set.serie.id}/${setId}`
    }
  }
  return null
}

// ── Lógica principal ─────────────────────────────────────────────────

async function resolveSet(setId, sampleNumber) {
  // 1. pokemontcg.io (EN)
  const pkmUrl = `https://images.pokemontcg.io/${setId}/${sampleNumber}_hires.png`
  if (await head(pkmUrl)) {
    return { source: 'pokemontcg' }
  }

  // 2. Scrydex (EN, verificado por contenido)
  const scrUrl = `https://images.scrydex.com/pokemon/${setId}-${sampleNumber}/large`
  if (await scrydexReal(scrUrl)) {
    return { source: 'scrydex' }
  }

  // 3. Scrydex sin padding
  const unpadded = unpad(sampleNumber)
  if (unpadded !== sampleNumber) {
    const scrUpUrl = `https://images.scrydex.com/pokemon/${setId}-${unpadded}/large`
    if (await scrydexReal(scrUpUrl)) {
      return { source: 'scrydex-unpadded' }
    }
  }

  // 4. TCGdex (Pocket, sets japoneses, multilingüe)
  const prefix = await resolveTcgdexPrefix(setId, sampleNumber)
  if (prefix) {
    return { source: 'tcgdex', prefix }
  }

  return { source: 'none' }
}

async function processBatch(items, concurrency, fn) {
  const results = new Map()
  let i = 0

  async function worker() {
    while (i < items.length) {
      const idx = i++
      const item = items[idx]
      const result = await fn(item)
      results.set(item.setId, result)
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
  return results
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log('📦 Leyendo index.json...')
  const indexRaw = await readFile(INDEX_PATH, 'utf8')
  const cards = JSON.parse(indexRaw)
  const langMap = JSON.parse(await readFile(LANG_MAP_PATH, 'utf8'))

  // Agrupar por set: quedarnos con la primera carta de cada set
  const setsMap = new Map()
  for (const card of cards) {
    const setId = card.setId
    if (!setsMap.has(setId)) {
      setsMap.set(setId, {
        setId,
        number: card.number,
        name: card.name
      })
    }
  }

  const sets = [...setsMap.values()]
  console.log(`🔍 Verificando ${sets.length} sets contra CDN (concurrency: ${CONCURRENCY})...`)

  const results = await processBatch(sets, CONCURRENCY, async ({ setId, number, name }) => {
    const { source, prefix } = await resolveSet(setId, number)
    const icon = source === 'none' ? '❌' : '✅'
    process.stdout.write(`  ${icon} ${setId} (${name}) → ${source}${prefix ? ' ' + prefix : ''}\n`)
    return { source, prefix }
  })

  // Contar estadísticas
  const stats = { pokemontcg: 0, scrydex: 0, 'scrydex-unpadded': 0, tcgdex: 0, none: 0 }
  for (const r of results.values()) {
    stats[r.source] = (stats[r.source] || 0) + 1
  }

  // Guardar manifest + mapa TCGdex
  const manifest = {}
  const tcgdexMap = {}
  for (const [setId, r] of results) {
    manifest[setId] = r.source
    if (r.prefix) tcgdexMap[setId] = r.prefix
  }
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  await writeFile(TCGDEX_MAP_PATH, JSON.stringify(tcgdexMap, null, 2) + '\n', 'utf8')

  console.log(`\n📊 Resultados:`)
  console.log(`  ✅ pokemontcg:      ${stats.pokemontcg} sets`)
  console.log(`  ✅ scrydex:         ${stats.scrydex} sets`)
  console.log(`  ✅ scrydex-pad:     ${stats['scrydex-unpadded']} sets`)
  console.log(`  ✅ tcgdex:          ${stats.tcgdex} sets`)
  console.log(`  ❌ sin imagen:      ${stats.none} sets`)
  console.log(`\n✅ Manifest guardado en ${MANIFEST_PATH}`)
  console.log(`✅ Mapa TCGdex (${Object.keys(tcgdexMap).length} sets) en ${TCGDEX_MAP_PATH}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
