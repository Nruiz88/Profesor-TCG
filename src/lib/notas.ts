import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const NOTAS_DIR = path.join(process.cwd(), 'notas')

export interface NotaMeta {
  slug: string
  title: string
}

export interface Nota extends NotaMeta {
  content: string
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.md$/, '')
  return base
    .split(/[-_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function titleFromContent(content: string, fallback: string): string {
  const m = content.match(/^#\s+(.+)$/m)
  return (m?.[1] ?? fallback).trim()
}

export async function listNotas(): Promise<NotaMeta[]> {
  try {
    const files = await readdir(NOTAS_DIR)
    const metas: NotaMeta[] = []
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const slug = file.replace(/\.md$/, '')
      metas.push({ slug, title: titleFromFilename(file) })
    }
    return metas.sort((a, b) => a.title.localeCompare(b.title, 'es'))
  } catch {
    return []
  }
}

export async function getNota(slug: string): Promise<Nota | null> {
  if (!/^[a-z0-9-_]+$/i.test(slug)) return null
  const filePath = path.join(NOTAS_DIR, `${slug}.md`)
  try {
    const content = await readFile(filePath, 'utf8')
    return { slug, title: titleFromContent(content, titleFromFilename(slug)), content }
  } catch {
    return null
  }
}
