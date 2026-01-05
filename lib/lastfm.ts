// Last.fm API client utilities

const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/'

export interface LastFMTrack {
  name: string
  artist: {
    '#text': string
  }
  album?: {
    '#text': string
  }
  date?: {
    '#text': string
    uts: string
  }
  '@attr'?: {
    nowplaying?: string
  }
}

export interface LastFMResponse {
  recenttracks?: {
    track: LastFMTrack[]
  }
  toptracks?: {
    track: Array<{
      name: string
      artist: {
        name: string
      }
      playcount: string
    }>
  }
  topartists?: {
    artist: Array<{
      name: string
      playcount: string
    }>
  }
}

export async function fetchLastFMData(
  method: string,
  username: string,
  apiKey: string,
  params: Record<string, string> = {}
): Promise<LastFMResponse> {
  const queryParams = new URLSearchParams({
    method,
    user: username,
    api_key: apiKey,
    format: 'json',
    ...params,
  })

  const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
  
  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.statusText}`)
  }

  return response.json()
}

export async function getRecentTracks(
  username: string,
  apiKey: string,
  limit: number = 50
): Promise<LastFMTrack[]> {
  const data = await fetchLastFMData('user.getrecenttracks', username, apiKey, {
    limit: limit.toString(),
  })
  
  const tracks = data.recenttracks?.track || []
  // Handle both single track and array responses
  return Array.isArray(tracks) ? tracks : [tracks]
}

export async function getTopTracks(
  username: string,
  apiKey: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '1month',
  limit: number = 50
) {
  const data = await fetchLastFMData('user.gettoptracks', username, apiKey, {
    period,
    limit: limit.toString(),
  })
  
  return data.toptracks?.track || []
}

export async function getTopArtists(
  username: string,
  apiKey: string,
  period: '7day' | '1month' | '3month' | '6month' | '12month' | 'overall' = '1month',
  limit: number = 50
) {
  const data = await fetchLastFMData('user.gettopartists', username, apiKey, {
    period,
    limit: limit.toString(),
  })
  
  return data.topartists?.artist || []
}

/**
 * Get artist image from Last.fm API
 * Returns the largest available image URL, or null if not available
 */
export async function getArtistImage(
  artist: string,
  apiKey: string
): Promise<string | null> {
  try {
    const queryParams = new URLSearchParams({
      method: 'artist.getInfo',
      artist,
      api_key: apiKey,
      format: 'json',
    })

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.error) {
      return null
    }

    const artistInfo = data.artist
    if (!artistInfo || !artistInfo.image) {
      return null
    }

    // Last.fm returns an array of images with different sizes
    // Order: small, medium, large, extralarge, mega
    const images = Array.isArray(artistInfo.image) ? artistInfo.image : []
    
    // Prefer mega, then extralarge, then large
    const megaImage = images.find((img: any) => img.size === 'mega' || img.size === 'extralarge')
    if (megaImage?.['#text']) {
      return megaImage['#text']
    }

    const extralargeImage = images.find((img: any) => img.size === 'extralarge')
    if (extralargeImage?.['#text']) {
      return extralargeImage['#text']
    }

    const largeImage = images.find((img: any) => img.size === 'large')
    if (largeImage?.['#text']) {
      return largeImage['#text']
    }

    // Fallback to any image with text
    const anyImage = images.find((img: any) => img['#text'] && img['#text'].trim() !== '')
    if (anyImage?.['#text']) {
      return anyImage['#text']
    }

    return null
  } catch (error) {
    console.error('Error fetching artist image from Last.fm:', error)
    return null
  }
}

/**
 * Get album image from Last.fm API
 * Returns the largest available image URL, or null if not available
 */
export async function getAlbumImage(
  artist: string,
  album: string,
  apiKey: string
): Promise<string | null> {
  try {
    const queryParams = new URLSearchParams({
      method: 'album.getInfo',
      artist,
      album,
      api_key: apiKey,
      format: 'json',
    })

    const response = await fetch(`${LASTFM_API_BASE}?${queryParams}`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.error) {
      return null
    }

    const albumInfo = data.album
    if (!albumInfo || !albumInfo.image) {
      return null
    }

    // Last.fm returns an array of images with different sizes
    // Order: small, medium, large, extralarge, mega
    const images = Array.isArray(albumInfo.image) ? albumInfo.image : []
    
    // Prefer mega, then extralarge, then large
    const megaImage = images.find((img: any) => img.size === 'mega' || img.size === 'extralarge')
    if (megaImage?.['#text']) {
      return megaImage['#text']
    }

    const extralargeImage = images.find((img: any) => img.size === 'extralarge')
    if (extralargeImage?.['#text']) {
      return extralargeImage['#text']
    }

    const largeImage = images.find((img: any) => img.size === 'large')
    if (largeImage?.['#text']) {
      return largeImage['#text']
    }

    // Fallback to any image with text
    const anyImage = images.find((img: any) => img['#text'] && img['#text'].trim() !== '')
    if (anyImage?.['#text']) {
      return anyImage['#text']
    }

    return null
  } catch (error) {
    console.error('Error fetching album image from Last.fm:', error)
    return null
  }
}

