import { prisma } from './prisma'
import { fetchLastFMArtistListeners } from './lastfm'
import type { TopItem } from './lastfm-weekly'

const API_KEY = process.env.LASTFM_API_KEY!

// The primary must have at least this many listeners on Last.fm to be
// trusted as a real artist. Cheap defence against splitting into garbage.
const MIN_LISTENERS = 1000

// The primary must have at least K× the compound's listener count to be
// accepted as canonical. Conservative — keeps legitimate compounds like
// Simon & Garfunkel intact while collapsing clear collabs.
const K = 5

// Compound names that should never be split. Case-insensitive lookup.
// Only contains names whose split would actively fire — & or "," forms.
// Names with "+", "and", or "-" delimiters aren't seeded because they
// don't trigger any of the split delimiters.
const COMPOUND_ARTIST_SAFELIST: ReadonlySet<string> = new Set(
  [
    'Simon & Garfunkel',
    'Hall & Oates',
    'Belle & Sebastian',
    'Ike & Tina Turner',
    'Mumford & Sons',
    'Iron & Wine',
    'Angus & Julia Stone',
    'Captain & Tennille',
    'Sonny & Cher',
    'Brooks & Dunn',
    'Macklemore & Ryan Lewis',
    'Marvin Gaye & Tammi Terrell',
    'Now, Now',
    'Earth, Wind & Fire',
    'Crosby, Stills & Nash',
    'Crosby, Stills, Nash & Young',
    'Emerson, Lake & Palmer',
  ].map((n) => n.toLowerCase())
)

/**
 * Extract the primary (leftmost) artist from a compound credit string.
 * Tries delimiters in priority order: ` & ` first, then `, `, then
 * ` feat./ft./featuring `. Returns null when no delimiter matches.
 */
export function splitPrimaryArtist(name: string): string | null {
  const delimiters: RegExp[] = [
    /\s+&\s+/,
    /,\s+/,
    /\s+(?:feat\.?|ft\.?|featuring)\s+/i,
  ]
  for (const re of delimiters) {
    const m = name.match(re)
    if (m && m.index !== undefined && m.index > 0) {
      return name.slice(0, m.index).trim()
    }
  }
  return null
}

/**
 * Resolve a single compound credit string to its canonical primary artist.
 * Hits the cache first; on miss, queries Last.fm listener counts and
 * persists the verdict.
 *
 * Failure mode: if the Last.fm API errors, returns the raw input and does
 * NOT cache, so a future regen retries the resolution.
 */
export async function resolveArtist(rawName: string): Promise<string> {
  if (!rawName) return rawName
  if (COMPOUND_ARTIST_SAFELIST.has(rawName.toLowerCase())) return rawName

  const primary = splitPrimaryArtist(rawName)
  if (!primary) return rawName

  const cached = await prisma.resolvedArtist.findUnique({
    where: { inputName: rawName },
  })
  if (cached) return cached.resolvedName

  try {
    const compoundListeners = await fetchLastFMArtistListeners(rawName, API_KEY)
    const primaryListeners = await fetchLastFMArtistListeners(primary, API_KEY)
    const splitApplied =
      primaryListeners > compoundListeners * K && primaryListeners >= MIN_LISTENERS
    const resolved = splitApplied ? primary : rawName

    await prisma.resolvedArtist.upsert({
      where: { inputName: rawName },
      create: {
        inputName: rawName,
        resolvedName: resolved,
        listenersInput: compoundListeners,
        listenersResolved: primaryListeners,
        splitApplied,
      },
      update: {
        resolvedName: resolved,
        listenersInput: compoundListeners,
        listenersResolved: primaryListeners,
        splitApplied,
        lastFetched: new Date(),
      },
    })

    return resolved
  } catch (err) {
    console.warn(
      `[Artist Resolution] Failed to resolve "${rawName}", keeping compound:`,
      err
    )
    return rawName
  }
}

/**
 * Resolve a batch of compound credit strings in one pass. Deduplicates,
 * filters safelist/no-split cases first, then hits the cache in one query,
 * then resolves the remaining uncached entries sequentially (the Last.fm
 * rate limiter handles spacing).
 */
export async function resolveArtistsBatch(
  rawNames: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const unique = Array.from(new Set(rawNames.filter((n) => n && n.length > 0)))

  if (unique.length === 0) return result

  const needsLookup: Array<{ raw: string; primary: string }> = []
  for (const name of unique) {
    if (COMPOUND_ARTIST_SAFELIST.has(name.toLowerCase())) {
      result.set(name, name)
      continue
    }
    const primary = splitPrimaryArtist(name)
    if (!primary) {
      result.set(name, name)
      continue
    }
    needsLookup.push({ raw: name, primary })
  }

  if (needsLookup.length === 0) return result

  const inputs = needsLookup.map((e) => e.raw)
  const cachedRows = await prisma.resolvedArtist.findMany({
    where: { inputName: { in: inputs } },
  })
  const cachedMap = new Map(cachedRows.map((r) => [r.inputName, r.resolvedName]))

  const stillUncached: Array<{ raw: string; primary: string }> = []
  for (const entry of needsLookup) {
    const hit = cachedMap.get(entry.raw)
    if (hit !== undefined) {
      result.set(entry.raw, hit)
    } else {
      stillUncached.push(entry)
    }
  }

  for (const { raw, primary } of stillUncached) {
    try {
      const compoundListeners = await fetchLastFMArtistListeners(raw, API_KEY)
      const primaryListeners = await fetchLastFMArtistListeners(primary, API_KEY)
      const splitApplied =
        primaryListeners > compoundListeners * K && primaryListeners >= MIN_LISTENERS
      const resolved = splitApplied ? primary : raw

      await prisma.resolvedArtist.upsert({
        where: { inputName: raw },
        create: {
          inputName: raw,
          resolvedName: resolved,
          listenersInput: compoundListeners,
          listenersResolved: primaryListeners,
          splitApplied,
        },
        update: {
          resolvedName: resolved,
          listenersInput: compoundListeners,
          listenersResolved: primaryListeners,
          splitApplied,
          lastFetched: new Date(),
        },
      })

      result.set(raw, resolved)
    } catch (err) {
      console.warn(
        `[Artist Resolution] Failed to resolve "${raw}", keeping compound:`,
        err
      )
      result.set(raw, raw)
    }
  }

  return result
}

/**
 * Group artists whose names match (case-insensitive), sum their playcounts,
 * and return the merged list sorted by descending playcount.
 *
 * Used after `resolveArtistsBatch` rewrites compound credits to their
 * primary — previously distinct entries (e.g. `"ROSALÍA"` from solo plays
 * and `"ROSALÍA & The Weeknd"` rewritten to `"ROSALÍA"`) collapse into one.
 *
 * Display name = highest-playcount variant's name (preserves whichever
 * casing the user listens to most).
 */
export function mergeRedundantArtists(artists: TopItem[]): TopItem[] {
  type Bucket = {
    name: string
    playcount: number
    topVariantPlays: number
  }
  const buckets = new Map<string, Bucket>()

  for (const artist of artists) {
    const rawName = artist.name || ''
    if (!rawName) continue
    const key = rawName.toLowerCase()
    const existing = buckets.get(key)

    if (!existing) {
      buckets.set(key, {
        name: rawName,
        playcount: artist.playcount,
        topVariantPlays: artist.playcount,
      })
      continue
    }

    existing.playcount += artist.playcount
    if (artist.playcount > existing.topVariantPlays) {
      existing.topVariantPlays = artist.playcount
      existing.name = rawName
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => {
      if (b.playcount !== a.playcount) return b.playcount - a.playcount
      return a.name.localeCompare(b.name)
    })
    .map(({ name, playcount }) => ({ name, playcount }))
}
