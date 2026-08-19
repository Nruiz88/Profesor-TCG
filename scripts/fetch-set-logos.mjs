#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = process.cwd()
const INDEX_PATH = join(ROOT, 'src', 'content', 'index.json')
const LOGOS_PATH = join(ROOT, 'src', 'content', 'set-logos.json')
const SCRYDEX_HASH = 'fd7c3800f9b8ebadf4b31a735f569a180e66201741b00fafa17879967884ad2c'

async function checkLogo(setId) {
  const url = `https://images.scrydex.com/pokemon/${setId}-logo/logo`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 100) return null
    const hash = createHash('sha256').update(buf).digest('hex')
    if (hash === SCRYDEX_HASH) return null
    return url
  } catch {
    return null
  }
}

async function main() {
  const cards = JSON.parse(await readFile(INDEX_PATH, 'utf8'))
  const setIds = [...new Set(cards.map(c => c.setId))]
  console.log(`Checking ${setIds.length} sets...`)

  const logos = {}
  let found = 0
  let i = 0

  async function worker() {
    while (i < setIds.length) {
      const idx = i++
      const setId = setIds[idx]
      const url = await checkLogo(setId)
      if (url) {
        logos[setId] = url
        found++
        process.stdout.write(`  ✅ ${setId}\n`)
      } else {
        process.stdout.write(`  ❌ ${setId}\n`)
      }
    }
  }

  await Promise.all(Array.from({ length: 10 }, () => worker()))
  console.log(`\n${found} logos found of ${setIds.length} sets`)
  await writeFile(LOGOS_PATH, JSON.stringify(logos, null, 2) + '\n', 'utf8')
  console.log(`Saved to ${LOGOS_PATH}`)
}

main().catch(e => { console.error(e); process.exit(1) })
