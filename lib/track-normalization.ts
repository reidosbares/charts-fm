import { TopItem } from './lastfm-weekly'

const FEAT_SUFFIX_RE = /\s*[\(\[]\s*(?:feat\.?|ft\.?|featuring)\b[^\)\]]*[\)\]]/gi

/**
 * Strip feat-style suffix patterns from a track title.
 * v1 patterns (case-insensitive): (feat. X), [feat. X], (ft. X), [ft. X], (featuring X), [featuring X].
 * Only matches inside parens/brackets, so titles like "A Feat of Strength" are safe.
 */
export function normalizeTrackName(name: string): string {
  return name.replace(FEAT_SUFFIX_RE, '').replace(/\s+/g, ' ').trim()
}
