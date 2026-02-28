/**
 * Client-side image cache for records (artist/album).
 * Shared by RecordsClient and RecordBlock so cards share the same cache.
 */

const IMAGE_CACHE_PREFIX = 'chartsfm_image_cache_'
const CACHE_EXPIRY_DAYS = 30
const ARTIST_CACHE_EXPIRY_HOURS = 1

interface CachedImage {
  url: string | null
  timestamp: number
}

export function getRecordsImageCacheKey(type: 'artist' | 'album', identifier: string): string {
  return `${IMAGE_CACHE_PREFIX}${type}_${identifier.toLowerCase().trim()}`
}

export function getCachedRecordsImage(type: 'artist' | 'album', identifier: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const IMAGE_CACHE_VERSION_KEY = 'chartsfm_image_cache_version'
    const cacheVersion = localStorage.getItem(IMAGE_CACHE_VERSION_KEY)
    const currentCacheVersion = '2'
    if (cacheVersion !== currentCacheVersion) {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      localStorage.setItem(IMAGE_CACHE_VERSION_KEY, currentCacheVersion)
      return undefined
    }

    const cacheKey = getRecordsImageCacheKey(type, identifier)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return undefined

    const data: CachedImage = JSON.parse(cached)
    const now = Date.now()
    const expiryTime =
      type === 'artist'
        ? data.timestamp + ARTIST_CACHE_EXPIRY_HOURS * 60 * 60 * 1000
        : data.timestamp + CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000

    if (now > expiryTime) {
      localStorage.removeItem(cacheKey)
      return undefined
    }

    return data.url
  } catch {
    return undefined
  }
}

export function setCachedRecordsImage(type: 'artist' | 'album', identifier: string, url: string | null): void {
  if (typeof window === 'undefined') return

  try {
    const cacheKey = getRecordsImageCacheKey(type, identifier)
    const data: CachedImage = { url, timestamp: Date.now() }
    localStorage.setItem(cacheKey, JSON.stringify(data))
  } catch {
    // Ignore
  }
}
