import { TopItem } from './lastfm-weekly'

const FEAT_SUFFIX_RE = /\s*(?:\(\s*(?:feat\.?|ft\.?|featuring)\b(?:[^()]|\([^()]*\))*\)|\[\s*(?:feat\.?|ft\.?|featuring)\b(?:[^\[\]]|\[[^\[\]]*\])*\])/gi

/**
 * Strip feat-style suffix patterns from a track title.
 * v1 patterns (case-insensitive): (feat. X), [feat. X], (ft. X), [ft. X], (featuring X), [featuring X].
 * Only matches inside parens/brackets, so titles like "A Feat of Strength" are safe.
 */
export function normalizeTrackName(name: string): string {
  return name.replace(FEAT_SUFFIX_RE, '').replace(/\s+/g, ' ').trim()
}

/**
 * Group tracks whose titles normalize to the same string (per artist), sum their
 * playcounts into a single entry, and return the merged list sorted by descending
 * playcount.
 *
 * Canonical display name = normalizeTrackName applied to the highest-playcount
 * variant's name. This preserves whichever casing/punctuation the user listens
 * to most, while always stripping the feat suffix.
 *
 * Key = (normalizedName.toLowerCase(), artist.toLowerCase()). Tracks with the
 * same normalized title but different artists stay separate.
 */
export function mergeRedundantTracks(tracks: TopItem[]): TopItem[] {
  type Bucket = {
    name: string
    artist: string
    playcount: number
    topVariantPlays: number
  }
  const buckets = new Map<string, Bucket>()

  for (const track of tracks) {
    const rawName = track.name || ''
    const artist = track.artist || ''
    const normalized = normalizeTrackName(rawName)
    const key = `${normalized.toLowerCase()}|${artist.toLowerCase()}`
    const existing = buckets.get(key)

    if (!existing) {
      buckets.set(key, {
        name: normalizeTrackName(rawName),
        artist,
        playcount: track.playcount,
        topVariantPlays: track.playcount,
      })
      continue
    }

    existing.playcount += track.playcount
    if (track.playcount > existing.topVariantPlays) {
      existing.topVariantPlays = track.playcount
      existing.name = normalizeTrackName(rawName)
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => {
      if (b.playcount !== a.playcount) return b.playcount - a.playcount
      return a.name.localeCompare(b.name)
    })
    .map(({ name, artist, playcount }) => ({ name, artist, playcount }))
}
