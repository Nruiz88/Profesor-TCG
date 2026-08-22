#!/usr/bin/env node
/**
 * Inyecta la versión actual (short SHA de git, o timestamp como fallback)
 * en la constante VERSION de public/sw.js. Cada build produce un SW distinto,
 * así el navegador detecta el cambio y el activate limpia caches viejas.
 *
 * Uso: node scripts/version-sw.mjs
 */

import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const SW_PATH = join(process.cwd(), 'public', 'sw.js')

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return null
  }
}

async function main() {
  const version = gitShortSha() ?? String(Date.now())
  const sw = await readFile(SW_PATH, 'utf8')

  const updated = sw.replace(/const VERSION = '[^']*'/, `const VERSION = 'v${version}'`)
  if (updated === sw) {
    console.error('❌ No se encontró `const VERSION = ...` en public/sw.js')
    process.exit(1)
  }

  await writeFile(SW_PATH, updated, 'utf8')
  console.log(`✅ SW versionado: v${version}`)
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})