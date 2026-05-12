import 'server-only'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import matter from 'gray-matter'

export interface NewsFrontmatter {
  title: string
  date: string
  excerpt?: string
  cover?: string
  tags?: string[]
  draft?: boolean
}

export interface NewsPostMeta extends NewsFrontmatter {
  slug: string
  locale: string
}

export interface NewsPost extends NewsPostMeta {
  body: string
}

const NEWS_DIR = join(process.cwd(), 'content', 'news')
const FILE_RE = /^(.+)-(en|pt)\.mdx?$/

function parseFilename(file: string): { slug: string; locale: string } | null {
  const match = file.match(FILE_RE)
  if (!match) return null
  return { slug: match[1], locale: match[2] }
}

function normalizeDate(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  return null
}

async function readPostFile(file: string): Promise<NewsPost | null> {
  const parsed = parseFilename(file)
  if (!parsed) return null
  const raw = await readFile(join(NEWS_DIR, file), 'utf-8')
  const { data, content } = matter(raw)
  const fm = data as Record<string, unknown>
  const title = typeof fm.title === 'string' ? fm.title : null
  const date = normalizeDate(fm.date)
  if (!title || !date) return null
  return {
    slug: parsed.slug,
    locale: parsed.locale,
    title,
    date,
    excerpt: typeof fm.excerpt === 'string' ? fm.excerpt : undefined,
    cover: typeof fm.cover === 'string' ? fm.cover : undefined,
    tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : undefined,
    draft: fm.draft === true,
    body: content,
  }
}

async function listFiles(): Promise<string[]> {
  try {
    return await readdir(NEWS_DIR)
  } catch {
    return []
  }
}

function isVisible(post: NewsPost): boolean {
  if (process.env.NODE_ENV === 'production' && post.draft) return false
  return true
}

function pickForLocale(posts: NewsPost[], locale: string): NewsPost[] {
  const bySlug = new Map<string, NewsPost>()
  for (const post of posts) {
    if (post.locale === locale) {
      bySlug.set(post.slug, post)
    }
  }
  for (const post of posts) {
    if (post.locale === 'en' && !bySlug.has(post.slug)) {
      bySlug.set(post.slug, post)
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getAllPosts(locale: string): Promise<NewsPost[]> {
  const files = await listFiles()
  const posts: NewsPost[] = []
  for (const file of files) {
    const post = await readPostFile(file)
    if (post && isVisible(post)) posts.push(post)
  }
  return pickForLocale(posts, locale)
}

export async function getPost(slug: string, locale: string): Promise<NewsPost | null> {
  const files = await listFiles()
  const localeFile = files.find((f) => {
    const parsed = parseFilename(f)
    return parsed?.slug === slug && parsed.locale === locale
  })
  const enFile = files.find((f) => {
    const parsed = parseFilename(f)
    return parsed?.slug === slug && parsed.locale === 'en'
  })
  const file = localeFile ?? enFile
  if (!file) return null
  const post = await readPostFile(file)
  return post && isVisible(post) ? post : null
}

export async function getAllSlugs(): Promise<string[]> {
  const files = await listFiles()
  const slugs = new Set<string>()
  for (const file of files) {
    const parsed = parseFilename(file)
    if (parsed) slugs.add(parsed.slug)
  }
  return Array.from(slugs)
}
