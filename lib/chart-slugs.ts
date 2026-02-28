// Slug generation and normalization utilities for chart entries

import { createHash } from 'crypto'

export type ChartType = 'artists' | 'tracks' | 'albums'

/**
 * Remove accents and diacritics from a string
 * Converts é -> e, ñ -> n, ü -> u, etc.
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Deterministic fallback slug when the entry key is only special characters
 * (e.g. "★", "…", emoji). Uses a short hash so the same entryKey always gets
 * the same slug and entries are still recordable and linkable.
 */
function fallbackSlugFromEntryKey(entryKey: string): string {
  const hash = createHash('sha256').update(entryKey, 'utf8').digest('base64url').slice(0, 12)
  return `e-${hash}`
}

/**
 * Generate a URL-friendly slug from an entryKey
 * For artists: entryKey is already URL-friendly (just lowercase name)
 * For tracks/albums: entryKey is "name|artist", convert to "name-artist"
 *
 * Removes accents, special characters, and normalizes to lowercase.
 * If the result would be empty (name is only special characters), returns
 * a deterministic hash-based slug so the entry can still be recorded.
 */
export function generateSlug(entryKey: string, chartType: ChartType): string {
  // Start with the entryKey
  let slug = entryKey.trim().toLowerCase()

  // Remove accents and diacritics
  slug = removeAccents(slug)

  // For tracks/albums, replace pipe with hyphen
  if (chartType !== 'artists') {
    slug = slug.replace(/\|/g, '-')
  }

  // Replace spaces and underscores with hyphens
  slug = slug.replace(/[\s_]+/g, '-')

  // Remove all special characters except hyphens and alphanumeric
  slug = slug.replace(/[^a-z0-9-]/g, '')

  // Collapse multiple hyphens into one
  slug = slug.replace(/-+/g, '-')

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-|-$/g, '').trim()

  // Names that are only special characters (e.g. "★", "…", emoji) produce
  // an empty slug; use a deterministic fallback so the entry is still recorded
  if (slug === '') {
    return fallbackSlugFromEntryKey(entryKey)
  }

  return slug
}

/**
 * Convert entryKey to slug (same logic as generateSlug)
 * This is a convenience alias for consistency
 */
export function entryKeyToSlug(entryKey: string, chartType: ChartType): string {
  return generateSlug(entryKey, chartType)
}

/** URL path segment for chart type (routes use singular: artist, track, album) */
export type ChartTypePathSegment = 'artist' | 'track' | 'album'

export function getChartTypePathSegment(chartType: ChartType): ChartTypePathSegment {
  switch (chartType) {
    case 'artists': return 'artist'
    case 'tracks': return 'track'
    case 'albums': return 'album'
    default: return 'artist'
  }
}

/**
 * Build the path to an entry's drill-down page for a group.
 * Use with next-intl's Link: <Link href={getEntryDrillDownPath(groupId, chartType, slug)}>
 */
export function getEntryDrillDownPath(
  groupId: string,
  chartType: ChartType,
  slug: string
): string {
  const segment = getChartTypePathSegment(chartType)
  return `/groups/${groupId}/charts/${segment}/${encodeURIComponent(slug)}`
}

