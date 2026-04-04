'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faUsers, faSpinner, faMedal, faTrophy } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import RecordBlock from '@/components/records/RecordBlock'
import MyContributionCard from '@/components/records/MyContributionCard'
import { Link } from '@/i18n/routing'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { generateSlug } from '@/lib/chart-slugs'
import { formatChartWeekLabel } from '@/lib/weekly-utils'
import SafeImage from '@/components/SafeImage'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useTranslations } from 'next-intl'

// Image cache helpers (same as GroupWeeklyChartsTab)
const IMAGE_CACHE_PREFIX = 'chartsfm_image_cache_'
const CACHE_EXPIRY_DAYS = 30
const ARTIST_CACHE_EXPIRY_HOURS = 1 // Artist images expire after 1 hour

interface CachedImage {
  url: string | null
  timestamp: number
}

function getCacheKey(type: 'artist' | 'album', identifier: string): string {
  return `${IMAGE_CACHE_PREFIX}${type}_${identifier.toLowerCase().trim()}`
}

function getCachedImage(type: 'artist' | 'album', identifier: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  
  try {
    // Check cache version - if it's outdated, clear all caches
    const IMAGE_CACHE_VERSION_KEY = 'chartsfm_image_cache_version'
    const cacheVersion = localStorage.getItem(IMAGE_CACHE_VERSION_KEY)
    const currentCacheVersion = '2' // Increment when cache structure changes or to force refresh
    if (cacheVersion !== currentCacheVersion) {
      // Clear all image caches when version changes
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
    
    const cacheKey = getCacheKey(type, identifier)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return undefined
    
    const data: CachedImage = JSON.parse(cached)
    const now = Date.now()
    // Artist images expire after 1 hour, album images after 30 days
    const expiryTime = type === 'artist' 
      ? data.timestamp + (ARTIST_CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
      : data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    if (now > expiryTime) {
      localStorage.removeItem(cacheKey)
      return undefined
    }
    
    return data.url
  } catch (error) {
    console.error('Error reading image cache:', error)
    return undefined
  }
}

function setCachedImage(type: 'artist' | 'album', identifier: string, url: string | null): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = getCacheKey(type, identifier)
    const data: CachedImage = {
      url,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(data))
  } catch (error) {
    console.error('Error writing image cache:', error)
    try {
      clearExpiredCache()
      const cacheKey = getCacheKey(type, identifier)
      const data: CachedImage = {
        url,
        timestamp: Date.now(),
      }
      localStorage.setItem(cacheKey, JSON.stringify(data))
    } catch (e) {
      // If still fails, just skip caching
    }
  }
}

function clearExpiredCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data: CachedImage = JSON.parse(cached)
            // Determine expiry based on cache key type
            const isArtist = key.includes('_artist_')
            const expiryTime = isArtist
              ? data.timestamp + (ARTIST_CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
              : data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            if (now > expiryTime) {
              keysToRemove.push(key)
            }
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
}

interface RecordsClientProps {
  groupId: string
  initialRecords: any
  memberCount: number
  isMember?: boolean
  userId?: string | null
}

export default function RecordsClient({ groupId, initialRecords, memberCount, isMember = false, userId = null }: RecordsClientProps) {
  const t = useSafeTranslations('records')
  const tPreview = useSafeTranslations('records.preview')
  const tChartRecords = useSafeTranslations('records.chartRecords')
  const tUserRecords = useSafeTranslations('records.userRecords')
  const tUserRecordsRich = useTranslations('records.userRecords')
  const tAwards = useSafeTranslations('records.awards')
  const tStatus = useSafeTranslations('records.status')
  const tTabs = useSafeTranslations('records.tabs')
  const { data: recordsResponse, mutate: mutateRecords } = useSWR<any>(`/api/groups/${groupId}/records`)
  const records = recordsResponse && !recordsResponse.error ? recordsResponse : initialRecords
  const isLoading = !recordsResponse
  const { data: previewResponse, isLoading: isLoadingPreview } = useSWR<any>(`/api/groups/${groupId}/records/preview`)
  const previewData = previewResponse && !previewResponse.error ? previewResponse : null
  
  // Get tab from hash fragment (e.g., #artists)
  const getTabFromHash = (): 'artists' | 'tracks' | 'albums' | 'users' | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: ('artists' | 'tracks' | 'albums' | 'users')[] = ['artists', 'tracks', 'albums', 'users']
    return validTabs.includes(hash as any) ? (hash as 'artists' | 'tracks' | 'albums' | 'users') : null
  }
  
  const defaultTab: 'artists' | 'tracks' | 'albums' | 'users' = 'users'
  // Initialize with defaultTab, then check hash on mount
  const [activeTab, setActiveTab] = useState<'artists' | 'tracks' | 'albums' | 'users'>(defaultTab)
  
  // Check hash fragment on mount and when hash changes
  useEffect(() => {
    const tabFromHash = getTabFromHash()
    if (tabFromHash) {
      setActiveTab(tabFromHash)
    }
    
    const handleHashChange = () => {
      const tabFromHash = getTabFromHash()
      if (tabFromHash && tabFromHash !== activeTab) {
        setActiveTab(tabFromHash)
      } else if (!tabFromHash && activeTab !== defaultTab) {
        // If hash is cleared, restore default tab
        setActiveTab(defaultTab)
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeTab, defaultTab])
  
  // Update hash when tab changes (no page refresh, preserves scroll position)
  const handleTabChange = (tabId: string) => {
    const tab = tabId as 'artists' | 'tracks' | 'albums' | 'users'
    setActiveTab(tab)
    // Update hash without causing page refresh or scroll
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
  }
  const [previewImages, setPreviewImages] = useState<{
    artist: string | null
    track: string | null
    album: string | null
  }>({
    artist: null,
    track: null,
    album: null,
  })
  const [previewImagesLoading, setPreviewImagesLoading] = useState<{
    artist: boolean
    track: boolean
    album: boolean
  }>({
    artist: false,
    track: false,
    album: false,
  })

  useEffect(() => {
    // Clean up expired cache entries on mount
    clearExpiredCache()
  }, [])

  // Extract records data from API response
  const recordsData = records?.records || (initialRecords?.status === 'completed' ? initialRecords.records : null)

  // Fetch images for preview cards
  useEffect(() => {
    if (!previewData) return

    // Fetch artist image
    if (previewData.artist?.name) {
      const cachedUrl = getCachedImage('artist', previewData.artist.name)
      
      if (cachedUrl !== undefined) {
        setPreviewImages((prev) => ({ ...prev, artist: cachedUrl }))
      } else {
        setPreviewImagesLoading((prev) => ({ ...prev, artist: true }))
        fetch(`/api/images/artist?artist=${encodeURIComponent(previewData.artist.name)}`)
          .then((res) => res.json())
          .then((result) => {
            const imageUrl = result.imageUrl || null
            setPreviewImages((prev) => ({ ...prev, artist: imageUrl }))
            setCachedImage('artist', previewData.artist.name, imageUrl)
            setPreviewImagesLoading((prev) => ({ ...prev, artist: false }))
          })
          .catch(() => {
            setPreviewImages((prev) => ({ ...prev, artist: null }))
            setCachedImage('artist', previewData.artist.name, null)
            setPreviewImagesLoading((prev) => ({ ...prev, artist: false }))
          })
      }
    }

    // Fetch track artist image
    if (previewData.track?.artist) {
      const cachedUrl = getCachedImage('artist', previewData.track.artist)
      
      if (cachedUrl !== undefined) {
        setPreviewImages((prev) => ({ ...prev, track: cachedUrl }))
      } else {
        setPreviewImagesLoading((prev) => ({ ...prev, track: true }))
        fetch(`/api/images/artist?artist=${encodeURIComponent(previewData.track.artist)}`)
          .then((res) => res.json())
          .then((result) => {
            const imageUrl = result.imageUrl || null
            setPreviewImages((prev) => ({ ...prev, track: imageUrl }))
            setCachedImage('artist', previewData.track.artist, imageUrl)
            setPreviewImagesLoading((prev) => ({ ...prev, track: false }))
          })
          .catch(() => {
            setPreviewImages((prev) => ({ ...prev, track: null }))
            setCachedImage('artist', previewData.track.artist, null)
            setPreviewImagesLoading((prev) => ({ ...prev, track: false }))
          })
      }
    }

    // Fetch album image
    if (previewData.album?.artist && previewData.album?.name) {
      const albumKey = `${previewData.album.artist}|${previewData.album.name}`
      const cachedUrl = getCachedImage('album', albumKey)
      
      if (cachedUrl !== undefined) {
        setPreviewImages((prev) => ({ ...prev, album: cachedUrl }))
      } else {
        setPreviewImagesLoading((prev) => ({ ...prev, album: true }))
        fetch(`/api/images/album?artist=${encodeURIComponent(previewData.album.artist)}&album=${encodeURIComponent(previewData.album.name)}`)
          .then((res) => res.json())
          .then((result) => {
            const imageUrl = result.imageUrl || null
            setPreviewImages((prev) => ({ ...prev, album: imageUrl }))
            setCachedImage('album', albumKey, imageUrl)
            setPreviewImagesLoading((prev) => ({ ...prev, album: false }))
          })
          .catch(() => {
            setPreviewImages((prev) => ({ ...prev, album: null }))
            setCachedImage('album', albumKey, null)
            setPreviewImagesLoading((prev) => ({ ...prev, album: false }))
          })
      }
    }
  }, [previewData])

  const tabs: TabItem[] = [
    { id: 'users', label: tTabs('users'), icon: faUsers },
    { id: 'artists', label: tTabs('artists'), icon: faMicrophone },
    { id: 'tracks', label: tTabs('tracks'), icon: faMusic },
    { id: 'albums', label: tTabs('albums'), icon: faCompactDisc },
  ]

  if (isLoading || !records) {
    return (
      <div className="flex items-center justify-center py-8 md:py-12">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
      </div>
    )
  }

  if (records.status === 'calculating') {
    return (
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
        <div className="mb-4 text-[var(--theme-primary)]">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl md:text-5xl" />
        </div>
        <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{tStatus('calculating')}</p>
        <p className="text-gray-500 text-xs md:text-sm mb-6">{tStatus('calculatingDescription')}</p>
      </div>
    )
  }

  if (records.status === 'failed') {
    const canRetry = records.chartsGeneratedAt && 
      (Date.now() - new Date(records.chartsGeneratedAt).getTime()) > 60 * 60 * 1000

    return (
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
        <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{tStatus('failed')}</p>
        <p className="text-gray-500 text-xs md:text-sm mb-6">
          {canRetry 
            ? tStatus('canRetry')
            : tStatus('waitToRetry')}
        </p>
        {canRetry && (
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/groups/${groupId}/records`, { method: 'POST' })
                if (res.ok) {
                  // Refresh records via SWR
                  mutateRecords()
                }
              } catch (err) {
                console.error('Error triggering recalculation:', err)
              }
            }}
            className="px-4 py-2 text-sm md:text-base bg-[var(--theme-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {tStatus('retryCalculation')}
          </button>
        )}
      </div>
    )
  }

  if (records.status !== 'completed' || !recordsData) {
    return (
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
        <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{tStatus('noRecords')}</p>
        <p className="text-gray-500 text-xs md:text-sm mb-6">{tStatus('generateCharts')}</p>
      </div>
    )
  }

  // Preview cards at the top
  const renderPreviewCards = () => {
    return (
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 md:p-6 border border-theme mb-4 md:mb-6">
        <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900 flex items-center gap-2">
          <FontAwesomeIcon icon={faMedal} className="text-[var(--theme-primary)] text-lg md:text-xl" />
          {tPreview('mostWeeksOnChart')}
        </h3>
        {isLoadingPreview ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-theme shadow-sm">
                <div className="flex items-center justify-center h-20 md:h-24">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl md:text-2xl text-[var(--theme-primary)]" />
                </div>
              </div>
            ))}
          </div>
        ) : previewData && (previewData.artist || previewData.track || previewData.album) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {previewData.artist && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-theme shadow-sm relative overflow-hidden">
                {(previewImagesLoading.artist || previewImages.artist !== null) && (
                  <div className="absolute top-0 right-0 bottom-0 w-1/3 h-full pointer-events-none overflow-hidden" style={{ borderRadius: '0 0.75rem 0.75rem 0' }}>
                    {previewImagesLoading.artist ? (
                      <div className="w-full h-full bg-gray-200 animate-pulse" />
                    ) : previewImages.artist ? (
                      <SafeImage
                        src={previewImages.artist}
                        alt={previewData.artist.name}
                        className="w-full h-full"
                        fill
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent z-10" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faMicrophone} className="text-[var(--theme-primary)] text-sm md:text-base" />
                    <span className="text-xs md:text-sm font-semibold text-gray-600">{tPreview('artist')}</span>
                  </div>
                  <Link
                    href={`/groups/${groupId}/charts/artist/${previewData.artist.slug}`}
                    className="font-bold text-base md:text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1 break-words"
                  >
                    {previewData.artist.name}
                  </Link>
                  <p className="text-xs md:text-sm text-gray-600">
                    {previewData.artist.value} {previewData.artist.value === 1 ? tPreview('week') : tPreview('weeks')}
                  </p>
                </div>
              </div>
            )}
            {previewData.track && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-theme shadow-sm relative overflow-hidden">
                {(previewImagesLoading.track || previewImages.track !== null) && (
                  <div className="absolute top-0 right-0 bottom-0 w-1/3 h-full pointer-events-none overflow-hidden" style={{ borderRadius: '0 0.75rem 0.75rem 0' }}>
                    {previewImagesLoading.track ? (
                      <div className="w-full h-full bg-gray-200 animate-pulse" />
                    ) : previewImages.track ? (
                      <SafeImage
                        src={previewImages.track}
                        alt={previewData.track.artist || previewData.track.name}
                        className="w-full h-full"
                        fill
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent z-10" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faMusic} className="text-[var(--theme-primary)] text-sm md:text-base" />
                    <span className="text-xs md:text-sm font-semibold text-gray-600">{tPreview('track')}</span>
                  </div>
                  <Link
                    href={`/groups/${groupId}/charts/track/${previewData.track.slug}`}
                    className="font-bold text-base md:text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1 break-words"
                  >
                    {previewData.track.name}
                  </Link>
                  {previewData.track.artist && (
                    <p className="text-xs text-gray-600 mb-1 break-words">{tPreview('by', { artist: previewData.track.artist })}</p>
                  )}
                  <p className="text-xs md:text-sm text-gray-600">
                    {previewData.track.value} {previewData.track.value === 1 ? tPreview('week') : tPreview('weeks')}
                  </p>
                </div>
              </div>
            )}
            {previewData.album && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-theme shadow-sm relative overflow-hidden">
                {(previewImagesLoading.album || previewImages.album !== null) && (
                  <div className="absolute top-0 right-0 bottom-0 w-1/3 h-full pointer-events-none overflow-hidden" style={{ borderRadius: '0 0.75rem 0.75rem 0' }}>
                    {previewImagesLoading.album ? (
                      <div className="w-full h-full bg-gray-200 animate-pulse" />
                    ) : previewImages.album ? (
                      <SafeImage
                        src={previewImages.album}
                        alt={previewData.album.name}
                        className="w-full h-full"
                        fill
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent z-10" />
                  </div>
                )}
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faCompactDisc} className="text-[var(--theme-primary)] text-sm md:text-base" />
                    <span className="text-xs md:text-sm font-semibold text-gray-600">{tPreview('album')}</span>
                  </div>
                  <Link
                    href={`/groups/${groupId}/charts/album/${previewData.album.slug}`}
                    className="font-bold text-base md:text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1 break-words"
                  >
                    {previewData.album.name}
                  </Link>
                  {previewData.album.artist && (
                    <p className="text-xs text-gray-600 mb-1 break-words">{tPreview('by', { artist: previewData.album.artist })}</p>
                  )}
                  <p className="text-xs md:text-sm text-gray-600">
                    {previewData.album.value} {previewData.album.value === 1 ? tPreview('week') : tPreview('weeks')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  // Render records for a chart type
  const renderChartTypeRecords = (chartType: 'artists' | 'tracks' | 'albums') => {
    const records: any[] = []
    
    if (!recordsData) return records
    
    // Most weeks on chart
    if (recordsData.mostWeeksOnChart?.[chartType]) {
      records.push({
        title: tChartRecords('mostWeeksOnChart'),
        record: recordsData.mostWeeksOnChart[chartType],
        value: `${recordsData.mostWeeksOnChart[chartType].value} ${recordsData.mostWeeksOnChart[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most weeks at #1
    if (recordsData.mostWeeksAtOne?.[chartType]) {
      records.push({
        title: tChartRecords('mostWeeksAtOne'),
        record: recordsData.mostWeeksAtOne[chartType],
        value: `${recordsData.mostWeeksAtOne[chartType].value} ${recordsData.mostWeeksAtOne[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most weeks in top 10
    if (recordsData.mostWeeksInTop10?.[chartType]) {
      records.push({
        title: tChartRecords('mostWeeksInTop10'),
        record: recordsData.mostWeeksInTop10[chartType],
        value: `${recordsData.mostWeeksInTop10[chartType].value} ${recordsData.mostWeeksInTop10[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most consecutive weeks
    if (recordsData.mostConsecutiveWeeks?.[chartType]) {
      records.push({
        title: tChartRecords('mostConsecutiveWeeks'),
        record: recordsData.mostConsecutiveWeeks[chartType],
        value: `${recordsData.mostConsecutiveWeeks[chartType].value} ${recordsData.mostConsecutiveWeeks[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most consecutive weeks at #1
    if (recordsData.mostConsecutiveWeeksAtOne?.[chartType]) {
      records.push({
        title: tChartRecords('mostConsecutiveWeeksAtOne'),
        record: recordsData.mostConsecutiveWeeksAtOne[chartType],
        value: `${recordsData.mostConsecutiveWeeksAtOne[chartType].value} ${recordsData.mostConsecutiveWeeksAtOne[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most consecutive weeks in top 10
    if (recordsData.mostConsecutiveWeeksInTop10?.[chartType]) {
      records.push({
        title: tChartRecords('mostConsecutiveWeeksInTop10'),
        record: recordsData.mostConsecutiveWeeksInTop10[chartType],
        value: `${recordsData.mostConsecutiveWeeksInTop10[chartType].value} ${recordsData.mostConsecutiveWeeksInTop10[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Most total VS
    if (recordsData.mostTotalVS?.[chartType]) {
      records.push({
        title: tChartRecords('totalAllTimeVS'),
        record: recordsData.mostTotalVS[chartType],
        value: recordsData.mostTotalVS[chartType].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      })
    }

    // Most plays
    if (recordsData.mostPlays?.[chartType]) {
      records.push({
        title: tChartRecords('mostPlaysReceived'),
        record: recordsData.mostPlays[chartType],
        value: recordsData.mostPlays[chartType].value.toLocaleString(),
      })
    }

    // Most VS in a single week
    if (recordsData.mostVSInSingleWeek?.[chartType]) {
      const weekLabel = recordsData.mostVSInSingleWeek[chartType].weekStart
        ? formatChartWeekLabel(new Date(recordsData.mostVSInSingleWeek[chartType].weekStart))
        : null
      records.push({
        title: tChartRecords('mostVSInSingleWeek'),
        record: recordsData.mostVSInSingleWeek[chartType],
        value: weekLabel
          ? `${recordsData.mostVSInSingleWeek[chartType].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VS · ${weekLabel}`
          : `${recordsData.mostVSInSingleWeek[chartType].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VS`,
      })
    }

    // Most plays in a single week
    if (recordsData.mostPlaysInSingleWeek?.[chartType]) {
      const weekLabel = recordsData.mostPlaysInSingleWeek[chartType].weekStart
        ? formatChartWeekLabel(new Date(recordsData.mostPlaysInSingleWeek[chartType].weekStart))
        : null
      records.push({
        title: tChartRecords('mostPlaysInSingleWeek'),
        record: recordsData.mostPlaysInSingleWeek[chartType],
        value: weekLabel
          ? `${recordsData.mostPlaysInSingleWeek[chartType].value.toLocaleString()} plays · ${weekLabel}`
          : `${recordsData.mostPlaysInSingleWeek[chartType].value.toLocaleString()} plays`,
      })
    }

    // Most popular
    if (recordsData.mostPopular?.[chartType]) {
      records.push({
        title: tChartRecords('mostPopular'),
        record: recordsData.mostPopular[chartType],
        value: `${recordsData.mostPopular[chartType].value} ${recordsData.mostPopular[chartType].value === 1 ? tChartRecords('member') : tChartRecords('members')}`,
      })
    }

    // Longest time between appearances
    if (recordsData.longestTimeBetweenAppearances?.[chartType]) {
      records.push({
        title: tChartRecords('longestTimeBetweenAppearances'),
        record: recordsData.longestTimeBetweenAppearances[chartType],
        value: `${recordsData.longestTimeBetweenAppearances[chartType].value} ${recordsData.longestTimeBetweenAppearances[chartType].value === 1 ? tPreview('week') : tPreview('weeks')}`,
      })
    }

    // Artist-specific records (only show for artists tab)
    if (chartType === 'artists') {
      if (recordsData.artistMostNumberOneSongs) {
        records.push({
          title: tChartRecords('artistMostNumberOneSongs'),
          record: recordsData.artistMostNumberOneSongs,
          value: `${recordsData.artistMostNumberOneSongs.value} ${recordsData.artistMostNumberOneSongs.value === 1 ? tChartRecords('song') : tChartRecords('songs')}`,
        })
      }
      if (recordsData.artistMostNumberOneAlbums) {
        records.push({
          title: tChartRecords('artistMostNumberOneAlbums'),
          record: recordsData.artistMostNumberOneAlbums,
          value: `${recordsData.artistMostNumberOneAlbums.value} ${recordsData.artistMostNumberOneAlbums.value === 1 ? tChartRecords('album') : tChartRecords('albums')}`,
        })
      }
      if (recordsData.artistMostSongsInTop10) {
        records.push({
          title: tChartRecords('artistMostSongsInTop10'),
          record: recordsData.artistMostSongsInTop10,
          value: `${recordsData.artistMostSongsInTop10.value} ${recordsData.artistMostSongsInTop10.value === 1 ? tChartRecords('song') : tChartRecords('songs')}`,
        })
      }
      if (recordsData.artistMostAlbumsInTop10) {
        records.push({
          title: tChartRecords('artistMostAlbumsInTop10'),
          record: recordsData.artistMostAlbumsInTop10,
          value: `${recordsData.artistMostAlbumsInTop10.value} ${recordsData.artistMostAlbumsInTop10.value === 1 ? tChartRecords('album') : tChartRecords('albums')}`,
        })
      }
      if (recordsData.artistMostSongsCharted) {
        records.push({
          title: tChartRecords('artistMostSongsCharted'),
          record: recordsData.artistMostSongsCharted,
          value: `${recordsData.artistMostSongsCharted.value} ${recordsData.artistMostSongsCharted.value === 1 ? tChartRecords('song') : tChartRecords('songs')}`,
        })
      }
      if (recordsData.artistMostAlbumsCharted) {
        records.push({
          title: tChartRecords('artistMostAlbumsCharted'),
          record: recordsData.artistMostAlbumsCharted,
          value: `${recordsData.artistMostAlbumsCharted.value} ${recordsData.artistMostAlbumsCharted.value === 1 ? tChartRecords('album') : tChartRecords('albums')}`,
        })
      }
    }

    return records
  }

  // Render user records
  const renderUserRecords = () => {
    const records: any[] = []

    if (recordsData.userMostVS) {
      records.push({
        title: tUserRecords('vsVirtuoso'),
        record: recordsData.userMostVS,
        value: recordsData.userMostVS.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        isUser: true,
      })
    }

    if (recordsData.userMostPlays) {
      records.push({
        title: tUserRecords('playPowerhouse'),
        record: recordsData.userMostPlays,
        value: recordsData.userMostPlays.value.toLocaleString(),
        isUser: true,
      })
    }

    if (recordsData.userMostEntries) {
      records.push({
        title: tUserRecords('chartConnoisseur'),
        record: recordsData.userMostEntries,
        value: `${recordsData.userMostEntries.value} ${recordsData.userMostEntries.value === 1 ? tUserRecords('entry') : tUserRecords('entries')}`,
        isUser: true,
      })
    }

    if (recordsData.userLeastEntries) {
      records.push({
        title: tUserRecords('hiddenGemHunter'),
        record: recordsData.userLeastEntries,
        value: `${recordsData.userLeastEntries.value} ${recordsData.userLeastEntries.value === 1 ? tUserRecords('entry') : tUserRecords('entries')}`,
        isUser: true,
      })
    }

    if (recordsData.userOneTrackMind) {
      const entryLabel = recordsData.userOneTrackMind.entryArtist
        ? `${recordsData.userOneTrackMind.entryName} — ${recordsData.userOneTrackMind.entryArtist}`
        : recordsData.userOneTrackMind.entryName
      records.push({
        title: tUserRecords('oneTrackMind'),
        record: recordsData.userOneTrackMind,
        value: `${recordsData.userOneTrackMind.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} VS · ${entryLabel}`,
        isUser: true,
      })
    }

    if (recordsData.userTasteMaker) {
      records.push({
        title: tUserRecords('tasteMaker'),
        record: recordsData.userTasteMaker,
        value: `${recordsData.userTasteMaker.value} ${recordsData.userTasteMaker.value === 1 ? tUserRecords('entry') : tUserRecords('entries')}`,
        isUser: true,
      })
    }

    return records
  }

  const currentRecords = activeTab === 'users' 
    ? renderUserRecords()
    : renderChartTypeRecords(activeTab)

  return (
    <div>
      {/* Records Title - big, bold, centered with theme styling */}
      <div className="text-center mb-4 md:mb-6 py-2 overflow-visible">
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold"
          style={{ 
            lineHeight: '1.2', 
            paddingBottom: '0.2em', 
            overflow: 'visible',
            backgroundImage: 'linear-gradient(to right, var(--theme-primary-darker), var(--theme-primary), var(--theme-primary-light))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {t('title')}
        </h1>
      </div>

      {renderPreviewCards()}

      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 md:p-6 border border-theme">
        <div className="flex justify-center mb-4 md:mb-6">
          <LiquidGlassTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {activeTab === 'users' && memberCount < 3 ? (
          <div className="relative min-h-[300px] md:min-h-[400px]">
            {/* Background content to blur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-theme shadow-sm h-24 md:h-32">
                  <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 md:h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            {/* Frosted overlay */}
            <div className="absolute inset-0 bg-white/30 backdrop-blur-md rounded-xl z-50 flex items-center justify-center border border-white/20 shadow-xl">
              <div className="text-center p-4 md:p-6 max-w-md">
                <p className="text-base md:text-lg font-semibold text-gray-800 mb-2 md:mb-3">
                  {tUserRecords('comingSoon')}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mb-2">
                  {tUserRecords('unlockMessage', {
                    count: memberCount,
                    memberOrMembers: memberCount === 1 ? tChartRecords('member') : tChartRecords('members'),
                    inviteCount: memberCount === 1 ? tUserRecords('inviteCountTwo') : memberCount === 2 ? tUserRecords('inviteCountOne') : ''
                  })}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mb-2">
                  {tUserRecords('unlockDescription')}
                </p>
              </div>
            </div>
          </div>
        ) : currentRecords.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <p className="text-sm md:text-base text-gray-600">{tStatus('noRecordsForCategory')}</p>
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-900">{tUserRecords('sectionTitle')}</h3>
                  <p className="text-sm text-gray-500">{tUserRecords('sectionSubtitle')}</p>
                </div>
                <LiquidGlassLink
                  href={`/groups/${groupId}/records/awards`}
                  variant="secondary"
                  size="sm"
                  useTheme
                >
                  {tAwards('viewAllRankings')} →
                </LiquidGlassLink>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {currentRecords.map((record, idx) => (
                <RecordBlock
                  key={idx}
                  title={record.title}
                  record={record.record}
                  value={record.value}
                  groupId={groupId}
                  isUser={record.isUser}
                  activeTab={activeTab}
                />
              ))}
            </div>
            {activeTab === 'users' && (
              <p className="text-xs md:text-sm text-gray-500 mt-4 md:mt-6">
                {tUserRecordsRich.rich('memberAwardsFAQLink', {
                  link: (chunks) => (
                    <Link
                      href="/faq#how-are-member-awards-decided"
                      className="text-[var(--theme-primary)] hover:underline transition-colors duration-200"
                    >
                      {chunks}
                    </Link>
                  )
                })}
              </p>
            )}
            {/* Most weeks as MVP – between member awards and impact per member */}
            {activeTab === 'users' && memberCount > 1 && records?.mostWeeksAsMVP && (
              <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-[var(--theme-border)]">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <FontAwesomeIcon icon={faTrophy} className="text-2xl md:text-3xl text-[var(--theme-primary)] flex-shrink-0" />
                  <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary)]">{tUserRecords('mostWeeksAsMVP')}</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-4">{tUserRecords('mostWeeksAsMVPTagline')}</p>
                <Link
                  href={`/u/${encodeURIComponent(records.mostWeeksAsMVP.lastfmUsername || records.mostWeeksAsMVP.name)}`}
                  className="flex items-center gap-4 md:gap-5 p-4 rounded-xl bg-white/80 border border-theme hover:border-[var(--theme-primary)]/50 transition-all"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[var(--theme-primary)]/50 bg-[var(--theme-primary)]/10">
                    <SafeImage
                      src={records.mostWeeksAsMVP.image || ''}
                      alt={records.mostWeeksAsMVP.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xl md:text-2xl font-bold text-gray-900 block truncate">{records.mostWeeksAsMVP.name}</span>
                    <span className="text-base md:text-lg text-[var(--theme-primary)] font-semibold">
                      {records.mostWeeksAsMVP.value === 1
                        ? tUserRecords('weeksAsMVPCount', { count: records.mostWeeksAsMVP.value })
                        : tUserRecords('weeksAsMVPCountPlural', { count: records.mostWeeksAsMVP.value })}
                    </span>
                  </div>
                </Link>
                <LiquidGlassLink
                  href={`/groups/${groupId}/records/mvp-by-week`}
                  variant="secondary"
                  size="sm"
                  useTheme
                  className="mt-3"
                >
                  {tUserRecords('viewMVPPerWeek')} →
                </LiquidGlassLink>
              </div>
            )}
            {/* My contribution - at bottom of Members tab (hidden for solo groups) */}
            {activeTab === 'users' && isMember && userId && memberCount > 1 && (
              <MyContributionCard groupId={groupId} userId={userId} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

