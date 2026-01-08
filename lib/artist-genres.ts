// Artist genre fetching and caching from Last.fm API

import { prisma } from './prisma'
import { acquireLastFMRateLimit } from './lastfm-rate-limiter'

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'
const GENRE_CACHE_DAYS = 30

/**
 * Fetch genres for an artist from Last.fm API
 */
async function fetchArtistGenresFromLastFM(
  artistName: string,
  apiKey: string
): Promise<string[]> {
  try {
    // Acquire rate limit token before making the request
    await acquireLastFMRateLimit(1)
    
    const queryParams = new URLSearchParams({
      method: 'artist.getInfo',
      artist: artistName,
      api_key: apiKey,
      format: 'json',
    })

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
    
    // Handle rate limiting (HTTP 429)
    if (response.status === 429) {
      throw new Error(`Last.fm API rate limit exceeded: ${response.statusText}`)
    }
    
    if (!response.ok) {
      throw new Error(`Last.fm API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`Last.fm API error: ${data.message || data.error}`)
    }

    const artistInfo = data.artist
    if (!artistInfo || !artistInfo.tags) {
      return []
    }

    // Last.fm returns tags as an object with a tag array
    const tags = artistInfo.tags?.tag || []
    const tagArray = Array.isArray(tags) ? tags : [tags]
    
    // Extract tag names (genres)
    const genres = tagArray
      .map((tag: any) => tag?.name || tag)
      .filter((name: any) => name && typeof name === 'string')
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0)

    return genres
  } catch (error) {
    console.error(`Error fetching genres for artist "${artistName}" from Last.fm:`, error)
    return []
  }
}

/**
 * Get genres for an artist, using cache if available
 * Returns empty array if genres cannot be fetched
 */
export async function getArtistGenres(
  artistName: string,
  apiKey: string
): Promise<string[]> {
  const normalizedName = artistName.toLowerCase().trim()
  
  if (!normalizedName) {
    return []
  }

  // Check cache first
  const cached = await prisma.artistGenre.findUnique({
    where: { artistName: normalizedName },
  })

  const now = new Date()
  const cacheExpiry = cached
    ? new Date(cached.lastFetched.getTime() + GENRE_CACHE_DAYS * 24 * 60 * 60 * 1000)
    : null

  // Use cache if it exists and is fresh
  if (cached && cacheExpiry && now < cacheExpiry) {
    return (cached.genres as string[]) || []
  }

  // Fetch from Last.fm API
  const genres = await fetchArtistGenresFromLastFM(artistName, apiKey)

  // Update or create cache entry
  await prisma.artistGenre.upsert({
    where: { artistName: normalizedName },
    create: {
      artistName: normalizedName,
      genres: genres,
      lastFetched: now,
    },
    update: {
      genres: genres,
      lastFetched: now,
    },
  })

  return genres
}

/**
 * Get genres for multiple artists in batch
 * Uses cache when available, fetches from API for missing/stale entries
 */
export async function getArtistGenresBatch(
  artistNames: string[],
  apiKey: string
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()
  const normalizedNames = artistNames.map(name => name.toLowerCase().trim()).filter(Boolean)
  
  if (normalizedNames.length === 0) {
    return result
  }

  // Fetch all cached entries
  const cachedEntries = await prisma.artistGenre.findMany({
    where: {
      artistName: { in: normalizedNames },
    },
  })

  const now = new Date()
  const cacheMap = new Map<string, { genres: string[]; lastFetched: Date }>()
  
  for (const cached of cachedEntries) {
    const cacheExpiry = new Date(cached.lastFetched.getTime() + GENRE_CACHE_DAYS * 24 * 60 * 60 * 1000)
    if (now < cacheExpiry) {
      cacheMap.set(cached.artistName, {
        genres: (cached.genres as string[]) || [],
        lastFetched: cached.lastFetched,
      })
      result.set(cached.artistName, (cached.genres as string[]) || [])
    }
  }

  // Fetch missing or stale artists from API
  const artistsToFetch = normalizedNames.filter(name => !cacheMap.has(name))
  
  // Batch fetch - rate limiter will handle spacing between requests automatically
  for (const artistName of artistsToFetch) {
    // Find original name (case-sensitive) for API call
    const originalName = artistNames.find(name => name.toLowerCase().trim() === artistName)
    if (!originalName) continue

    const genres = await fetchArtistGenresFromLastFM(originalName, apiKey)
    result.set(artistName, genres)

    // Update cache
    await prisma.artistGenre.upsert({
      where: { artistName },
      create: {
        artistName,
        genres,
        lastFetched: now,
      },
      update: {
        genres,
        lastFetched: now,
      },
    })
  }

  return result
}

