// Group compatibility score calculation

import { prisma } from './prisma'
import { TopItem } from './lastfm-weekly'
import { getArtistGenresBatch } from './artist-genres'

// Import similarity libraries (user will install these)
// @ts-ignore - will be available after npm install
import { similarity } from 'ml-distance'

const WEIGHTS = {
  artistOverlap: 0.25,  // Swapped with genreOverlap
  trackOverlap: 0.20,   // Reduced from 0.35 (less penalty for low overlap)
  genreOverlap: 0.45,   // Swapped with artistOverlap (now most important)
  patternScore: 0.10,   // Unchanged
}

const CACHE_DAYS = 7

export interface CompatibilityScore {
  score: number // 0-100
  artistOverlap: number
  trackOverlap: number
  genreOverlap: number
  patternScore: number
}

/**
 * Normalize entry key for matching
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: 'artists' | 'tracks' | 'albums'): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase().trim()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase().trim()
}

/**
 * Calculate weighted Jaccard similarity between two sets
 * Items are weighted by their playcount rank
 */
function weightedJaccardSimilarity(
  set1: TopItem[],
  set2: TopItem[]
): number {
  if (set1.length === 0 && set2.length === 0) return 1
  if (set1.length === 0 || set2.length === 0) return 0

  // Create maps with normalized keys and weights
  const map1 = new Map<string, number>()
  const map2 = new Map<string, number>()

  // Weight by inverse rank (higher position = higher weight)
  set1.forEach((item, index) => {
    const key = getEntryKey(item, 'artists')
    const weight = 1 / (index + 1) // Position 0 gets weight 1, position 1 gets 0.5, etc.
    map1.set(key, (map1.get(key) || 0) + weight * item.playcount)
  })

  set2.forEach((item, index) => {
    const key = getEntryKey(item, 'artists')
    const weight = 1 / (index + 1)
    map2.set(key, (map2.get(key) || 0) + weight * item.playcount)
  })

  // Calculate intersection and union
  let intersection = 0
  let union = 0

  const allKeys = new Set([...map1.keys(), ...map2.keys()])
  
  for (const key of allKeys) {
    const val1 = map1.get(key) || 0
    const val2 = map2.get(key) || 0
    intersection += Math.min(val1, val2)
    union += Math.max(val1, val2)
  }

  return union > 0 ? intersection / union : 0
}

/**
 * Calculate track overlap similarity
 */
function trackOverlapSimilarity(
  userTracks: TopItem[],
  groupTracks: TopItem[]
): number {
  if (userTracks.length === 0 && groupTracks.length === 0) return 1
  if (userTracks.length === 0 || groupTracks.length === 0) return 0

  const map1 = new Map<string, number>()
  const map2 = new Map<string, number>()

  userTracks.forEach((item, index) => {
    const key = getEntryKey(item, 'tracks')
    const weight = 1 / (index + 1)
    map1.set(key, (map1.get(key) || 0) + weight * item.playcount)
  })

  groupTracks.forEach((item, index) => {
    const key = getEntryKey(item, 'tracks')
    const weight = 1 / (index + 1)
    map2.set(key, (map2.get(key) || 0) + weight * item.playcount)
  })

  let intersection = 0
  let union = 0

  const allKeys = new Set([...map1.keys(), ...map2.keys()])
  
  for (const key of allKeys) {
    const val1 = map1.get(key) || 0
    const val2 = map2.get(key) || 0
    intersection += Math.min(val1, val2)
    union += Math.max(val1, val2)
  }

  return union > 0 ? intersection / union : 0
}

/**
 * Transform track overlap with non-linear scaling
 * Makes small overlaps more valuable and reduces penalty for low overlap
 * Uses square root curve (exponent 0.6) to boost small values
 */
function transformTrackOverlap(rawOverlap: number): number {
  if (rawOverlap === 0) return 0
  // Square root curve with exponent 0.6:
  // 0.1 → ~0.25, 0.2 → ~0.35, 0.5 → ~0.66, 1.0 → 1.0
  // This makes small overlaps contribute more to the final score
  return Math.pow(rawOverlap, 0.6)
}

/**
 * Calculate genre overlap using cosine similarity
 */
function genreOverlapSimilarity(
  userGenres: Map<string, string[]>,
  groupGenres: Map<string, string[]>
): number {
  // Build genre frequency vectors
  const genreFreq = new Map<string, { user: number; group: number }>()

  // Count user genres
  for (const genres of userGenres.values()) {
    for (const genre of genres) {
      const normalized = genre.toLowerCase().trim()
      if (normalized) {
        const current = genreFreq.get(normalized) || { user: 0, group: 0 }
        genreFreq.set(normalized, { ...current, user: current.user + 1 })
      }
    }
  }

  // Count group genres
  for (const genres of groupGenres.values()) {
    for (const genre of genres) {
      const normalized = genre.toLowerCase().trim()
      if (normalized) {
        const current = genreFreq.get(normalized) || { user: 0, group: 0 }
        genreFreq.set(normalized, { ...current, group: current.group + 1 })
      }
    }
  }

  if (genreFreq.size === 0) {
    return 0
  }

  // Build vectors
  const allGenres = Array.from(genreFreq.keys())
  const userVector = allGenres.map(genre => genreFreq.get(genre)!.user)
  const groupVector = allGenres.map(genre => genreFreq.get(genre)!.group)

  // Calculate cosine similarity
  try {
    const cosineSimilarity = similarity.cosine(userVector, groupVector)
    return isNaN(cosineSimilarity) ? 0 : Math.max(0, cosineSimilarity) // Ensure non-negative
  } catch (error) {
    console.error('Error calculating cosine similarity:', error)
    return 0
  }
}

/**
 * Calculate listening pattern score
 * Combines diversity, consistency, and recency
 */
function calculatePatternScore(
  userWeeklyStats: Array<{ topArtists: TopItem[]; topTracks: TopItem[]; weekStart: Date }>
): number {
  if (userWeeklyStats.length === 0) return 0

  // Diversity: unique artists/tracks ratio
  const allArtists = new Set<string>()
  const allTracks = new Set<string>()
  let totalPlays = 0

  userWeeklyStats.forEach(week => {
    week.topArtists.forEach(artist => {
      allArtists.add(getEntryKey(artist, 'artists'))
      totalPlays += artist.playcount
    })
    week.topTracks.forEach(track => {
      allTracks.add(getEntryKey(track, 'tracks'))
      totalPlays += track.playcount
    })
  })

  const diversity = totalPlays > 0 
    ? (allArtists.size + allTracks.size) / (userWeeklyStats.length * 2)
    : 0
  const diversityScore = Math.min(1, diversity / 10) // Normalize to 0-1

  // Consistency: variance in weekly listening volume
  const weeklyPlays = userWeeklyStats.map(week => {
    const artistPlays = week.topArtists.reduce((sum, a) => sum + a.playcount, 0)
    const trackPlays = week.topTracks.reduce((sum, t) => sum + t.playcount, 0)
    return artistPlays + trackPlays
  })

  if (weeklyPlays.length === 0) return 0

  const avgPlays = weeklyPlays.reduce((sum, p) => sum + p, 0) / weeklyPlays.length
  const variance = weeklyPlays.reduce((sum, p) => sum + Math.pow(p - avgPlays, 2), 0) / weeklyPlays.length
  const stdDev = Math.sqrt(variance)
  const consistencyScore = avgPlays > 0 ? Math.max(0, 1 - (stdDev / avgPlays)) : 0

  // Recency: weight recent weeks more heavily (exponential decay)
  const now = new Date()
  let recencyWeightedSum = 0
  let totalWeight = 0

  userWeeklyStats.forEach((week, index) => {
    const daysAgo = (now.getTime() - week.weekStart.getTime()) / (1000 * 60 * 60 * 24)
    const weight = Math.exp(-daysAgo / 30) // Exponential decay with 30-day half-life
    const weekPlays = weeklyPlays[index] || 0
    recencyWeightedSum += weekPlays * weight
    totalWeight += weight
  })

  const recencyScore = totalWeight > 0 ? recencyWeightedSum / (totalWeight * avgPlays) : 0

  // Combine scores (equal weight)
  return (diversityScore * 0.33 + consistencyScore * 0.33 + Math.min(1, recencyScore) * 0.34)
}

/**
 * Get user's aggregated top artists and tracks from recent weeks
 */
async function getUserRecentStats(
  userId: string,
  weeks: number = 8
): Promise<{ topArtists: TopItem[]; topTracks: TopItem[]; weeklyStats: Array<{ topArtists: TopItem[]; topTracks: TopItem[]; weekStart: Date }> }> {
  const now = new Date()
  const weeksAgo = new Date(now)
  weeksAgo.setUTCDate(weeksAgo.getUTCDate() - weeks * 7)

  const weeklyStats = await prisma.userWeeklyStats.findMany({
    where: {
      userId,
      weekStart: { gte: weeksAgo },
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Aggregate artists and tracks
  const artistMap = new Map<string, { name: string; playcount: number }>()
  const trackMap = new Map<string, { name: string; artist: string; playcount: number }>()

  const processedStats = weeklyStats.map(stat => ({
    topArtists: (stat.topArtists as unknown as TopItem[]) || [],
    topTracks: (stat.topTracks as unknown as TopItem[]) || [],
    weekStart: stat.weekStart,
  }))

  for (const stat of processedStats) {
    for (const artist of stat.topArtists) {
      const key = getEntryKey(artist, 'artists')
      const existing = artistMap.get(key)
      if (existing) {
        existing.playcount += artist.playcount
      } else {
        artistMap.set(key, {
          name: artist.name,
          playcount: artist.playcount,
        })
      }
    }

    for (const track of stat.topTracks) {
      const key = getEntryKey(track, 'tracks')
      const existing = trackMap.get(key)
      if (existing) {
        existing.playcount += track.playcount
      } else {
        trackMap.set(key, {
          name: track.name,
          artist: track.artist || '',
          playcount: track.playcount,
        })
      }
    }
  }

  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 100)

  const topTracks = Array.from(trackMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 100)

  return {
    topArtists,
    topTracks,
    weeklyStats: processedStats,
  }
}

/**
 * Calculate compatibility score between a user and a group
 */
export async function calculateCompatibilityScore(
  userId: string,
  groupId: string,
  apiKey: string
): Promise<CompatibilityScore> {
  // Get user's recent stats
  const userStats = await getUserRecentStats(userId, 8)

  // Get group's all-time stats
  const groupStats = await prisma.groupAllTimeStats.findUnique({
    where: { groupId },
  })

  if (!groupStats) {
    // No group stats available
    return {
      score: 0,
      artistOverlap: 0,
      trackOverlap: 0,
      genreOverlap: 0,
      patternScore: 0,
    }
  }

  const groupArtists = (groupStats.topArtists as unknown as TopItem[]) || []
  const groupTracks = (groupStats.topTracks as unknown as TopItem[]) || []

  // Calculate artist overlap (25%)
  const artistOverlap = weightedJaccardSimilarity(
    userStats.topArtists,
    groupArtists
  )

  // Calculate track overlap (20% with non-linear transformation)
  // Raw overlap is transformed to make small overlaps more valuable
  const rawTrackOverlap = trackOverlapSimilarity(
    userStats.topTracks,
    groupTracks
  )
  const trackOverlap = transformTrackOverlap(rawTrackOverlap)

  // Calculate genre overlap (45% - now most important)
  // Get genres for top artists
  const userArtistNames = userStats.topArtists.slice(0, 30).map(a => a.name)
  const groupArtistNames = groupArtists.slice(0, 30).map(a => a.name)
  const allArtistNames = [...new Set([...userArtistNames, ...groupArtistNames])]

  const artistGenres = await getArtistGenresBatch(allArtistNames, apiKey)

  const userGenres = new Map<string, string[]>()
  const groupGenres = new Map<string, string[]>()

  userArtistNames.forEach(name => {
    const normalized = name.toLowerCase().trim()
    const genres = artistGenres.get(normalized) || []
    if (genres.length > 0) {
      userGenres.set(normalized, genres)
    }
  })

  groupArtistNames.forEach(name => {
    const normalized = name.toLowerCase().trim()
    const genres = artistGenres.get(normalized) || []
    if (genres.length > 0) {
      groupGenres.set(normalized, genres)
    }
  })

  const genreOverlap = genreOverlapSimilarity(userGenres, groupGenres)

  // Calculate listening pattern score (10% - unchanged)
  const patternScore = calculatePatternScore(userStats.weeklyStats)

  // Calculate final weighted score (0-100)
  const score = (
    artistOverlap * WEIGHTS.artistOverlap +
    trackOverlap * WEIGHTS.trackOverlap +
    genreOverlap * WEIGHTS.genreOverlap +
    patternScore * WEIGHTS.patternScore
  ) * 100

  return {
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    artistOverlap: Math.round(artistOverlap * 10000) / 100,
    trackOverlap: Math.round(trackOverlap * 10000) / 100,
    genreOverlap: Math.round(genreOverlap * 10000) / 100,
    patternScore: Math.round(patternScore * 10000) / 100,
  }
}

/**
 * Check if a cached compatibility score exists and is fresh
 * Returns the score if fresh, null if missing or stale
 */
export async function getCachedCompatibilityScore(
  userId: string,
  groupId: string
): Promise<CompatibilityScore | null> {
  const cached = await prisma.groupCompatibilityScore.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  })

  if (!cached) {
    return null
  }

  const now = new Date()
  const cacheExpiry = new Date(cached.lastCalculated.getTime() + CACHE_DAYS * 24 * 60 * 60 * 1000)

  // Return cached score if fresh
  if (now < cacheExpiry) {
    return {
      score: cached.score,
      artistOverlap: cached.artistOverlap,
      trackOverlap: cached.trackOverlap,
      genreOverlap: cached.genreOverlap,
      patternScore: cached.patternScore,
    }
  }

  return null // Stale
}

/**
 * Get cached compatibility score or calculate if missing/stale
 */
export async function getOrCalculateCompatibilityScore(
  userId: string,
  groupId: string,
  apiKey: string
): Promise<CompatibilityScore> {
  // Check cache first
  const cached = await getCachedCompatibilityScore(userId, groupId)
  if (cached) {
    return cached
  }

  // Calculate new score
  const score = await calculateCompatibilityScore(userId, groupId, apiKey)

  // Cache the result
  const now = new Date()
  await prisma.groupCompatibilityScore.upsert({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    create: {
      userId,
      groupId,
      score: score.score,
      artistOverlap: score.artistOverlap,
      trackOverlap: score.trackOverlap,
      genreOverlap: score.genreOverlap,
      patternScore: score.patternScore,
      lastCalculated: now,
    },
    update: {
      score: score.score,
      artistOverlap: score.artistOverlap,
      trackOverlap: score.trackOverlap,
      genreOverlap: score.genreOverlap,
      patternScore: score.patternScore,
      lastCalculated: now,
    },
  })

  return score
}

