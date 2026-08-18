#!/usr/bin/env node
/**
 * Pre-computa las URLs de imagen para todas las cartas del catálogo.
 *
 * Estrategia eficiente: verifica UNA carta por set contra cada CDN, no todas.
 * Si pokemontcg.io tiene el set → todas las cartas usan pokemontcg.io.
 * Si no → prueba Scrydex. Si no → placeholder.
 *
 * Para idiomas no-ingleses, verifica TCGdex como fuente primaria.
 *
 * Salida: src/content/image-manifest.json
 *   { "sv3": "pokemontcg", "me5": "scrydex", "base1": "pokemontcg", ... }
 *
 * Uso: node scripts/precompute-images.mjs
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()
const INDEX_PATH = join(ROOT, 'src', 'content', 'index.json')
const MANIFEST_PATH = join(ROOT, 'src', 'content', 'image-manifest.json')
const CONCURRENCY = 10
const TIMEOUT = 5000

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

async function checkSource(url) {
  return head(url)
}

// ── Lógica principal ─────────────────────────────────────────────────

async function resolveSet(setId, sampleNumber) {
  // 1. pokemontcg.io (EN)
  const pkmUrl = `https://images.pokemontcg.io/${setId}/${sampleNumber}_hires.png`
  if (await checkSource(pkmUrl)) {
    return 'pokemontcg'
  }

  // 2. Scrydex (EN, fallback para sets chicos)
  const scrUrl = `https://images.scrydex.com/pokemon/${setId}-${sampleNumber}/large`
  if (await checkSource(scrUrl)) {
    return 'scrydex'
  }

  // 3. Scrydex sin padding
  const unpadded = sampleNumber.replace(/^0+(?=\d)/, '')
  if (unpadded !== sampleNumber) {
    const scrUpUrl = `https://images.scrydex.com/pokemon/${setId}-${unpadded}/large`
    if (await checkSource(scrUpUrl)) {
      return 'scrydex-unpadded'
    }
  }

  // 4. TCGdex (multilingüe)
  const series = (setId.match(/^([a-z]+)/i) || [])[1]?.toLowerCase() || ''
  if (series) {
    const tcgdexEn = `https://assets.tcgdex.net/en/${series}/${setId}/${sampleNumber}/high.png`
    if (await checkSource(tcgdexEn)) {
      return 'tcgdex'
    }
  }

  return 'none'
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
    const source = await resolveSet(setId, number)
    const icon = source === 'none' ? '❌' : '✅'
    process.stdout.write(`  ${icon} ${setId} (${name}) → ${source}\n`)
    return source
  })

  // Contar estadísticas
  const stats = { pokemontcg: 0, scrydex: 0, 'scrydex-unpadded': 0, tcgdex: 0, none: 0 }
  for (const source of results.values()) {
    stats[source] = (stats[source] || 0) + 1
  }

  // Guardar manifest
  const manifest = Object.fromEntries(results)
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  console.log(`\n📊 Resultados:`)
  console.log(`  ✅ pokemontcg:    ${stats.pokemontcg} sets`)
  console.log(`  ✅ scrydex:       ${stats.scrydex} sets`)
  console.log(`  ✅ scrydex-pad:   ${stats['scrydex-unpadded']} sets`)
  console.log(`  ✅ tcgdex:        ${stats.tcgdex} sets`)
  console.log(`  ❌ sin imagen:    ${stats.none} sets`)
  console.log(`\n✅ Manifest guardado en ${MANIFEST_PATH}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
