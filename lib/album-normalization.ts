import type { TopItem } from './lastfm-weekly'

// Matches a trailing (…) or […] whose interior contains a recognised
// edition/remaster/region/content-rating phrase. Anchored to end of string.
//
// The first alternative `[^)\]]*\s+edition` covers anything ending in "Edition"
// (Deluxe Edition, The Paradise Edition, 20th Anniversary Edition, …).
// We deliberately do NOT use a parallel `.+?\s+version` rule because that
// would over-strip canonical titles like "(Taylor's Version)". Instead,
// only specific edition phrases are allowed before "Version".
const ALBUM_EDITION_SUFFIX_RE = /\s*[\(\[]\s*(?:[^)\]]*\s+edition|(?:deluxe|super\s+deluxe|special|bonus\s+track|expanded)\s+version|super\s+deluxe|deluxe|remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?(?:\s+version)?|\d{4}\s+mix|\d{1,3}(?:st|nd|rd|th)\s+anniversary|bonus\s+tracks?|explicit|clean)\s*[\)\]]\s*$/i

// Matches Apple-Music-style " - <suffix>" anchored to end of string.
const ALBUM_FORMAT_SUFFIX_RE = /\s+-\s+(?:single|ep|deluxe(?:\s+edition)?|bonus\s+track\s+version|remaster(?:ed)?)\s*$/i

/**
 * Strip recognised album-title suffixes (editions, remasters, region/format
 * markers) from the end of an album name. Applies both regexes iteratively
 * until the string is stable, so combined suffixes like
 * "Album (Deluxe Edition) (Remastered 2019)" strip fully.
 *
 * Patterns intentionally NOT stripped: (Live), (Live at …), (Soundtrack),
 * (OST), (Taylor's Version) — these denote distinct works or are part of
 * the canonical title.
 */
export function normalizeAlbumName(name: string): string {
  let prev = ''
  let next = name
  while (next !== prev) {
    prev = next
    next = next.replace(ALBUM_EDITION_SUFFIX_RE, '')
    next = next.replace(ALBUM_FORMAT_SUFFIX_RE, '')
  }
  return next.replace(/\s+/g, ' ').trim()
}

/**
 * Group albums whose titles normalize to the same string (per artist), sum
 * their playcounts into a single entry, and return the merged list sorted
 * by descending playcount.
 *
 * Canonical display name = normalizeAlbumName applied to the highest-
 * playcount variant's name. This preserves whichever casing/punctuation
 * the user listens to most, while always stripping recognised suffixes.
 *
 * Key = (normalizedName.toLowerCase(), artist.toLowerCase()). Albums with
 * the same normalized title but different artists stay separate.
 */
export function mergeRedundantAlbums(albums: TopItem[]): TopItem[] {
  type Bucket = {
    name: string
    artist: string
    playcount: number
    topVariantPlays: number
  }
  const buckets = new Map<string, Bucket>()

  for (const album of albums) {
    const rawName = album.name || ''
    const artist = album.artist || ''
    const normalized = normalizeAlbumName(rawName)
    const key = `${normalized.toLowerCase()}|${artist.toLowerCase()}`
    const existing = buckets.get(key)

    if (!existing) {
      buckets.set(key, {
        name: normalized,
        artist,
        playcount: album.playcount,
        topVariantPlays: album.playcount,
      })
      continue
    }

    existing.playcount += album.playcount
    if (album.playcount > existing.topVariantPlays) {
      existing.topVariantPlays = album.playcount
      existing.name = normalizeAlbumName(rawName)
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => {
      if (b.playcount !== a.playcount) return b.playcount - a.playcount
      return a.name.localeCompare(b.name)
    })
    .map(({ name, artist, playcount }) => ({ name, artist, playcount }))
}
