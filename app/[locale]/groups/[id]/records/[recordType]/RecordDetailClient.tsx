'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMusic, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { ChartType } from '@/lib/chart-slugs'
import { isArtistSpecificRecordType } from '@/lib/group-records'
import { formatChartWeekLabel, formatChartWeekDate } from '@/lib/weekly-utils'

// Map record type to translation key
function getRecordTypeTranslationKey(recordType: string): string {
  const mapping: Record<string, string> = {
    'most-weeks-on-chart': 'mostWeeksOnChart',
    'most-weeks-in-top-10': 'mostWeeksInTop10',
    'most-consecutive-weeks': 'mostConsecutiveWeeks',
    'most-plays': 'mostPlaysReceived',
    'most-total-vs': 'totalAllTimeVS',
    'most-weeks-at-one': 'mostWeeksAtOne',
    'most-vs-in-single-week': 'mostVSInSingleWeek',
    'most-plays-in-single-week': 'mostPlaysInSingleWeek',
    'artist-most-number-one-songs': 'artistMostNumberOneSongs',
    'artist-most-number-one-albums': 'artistMostNumberOneAlbums',
    'artist-most-songs-in-top-10': 'artistMostSongsInTop10',
    'artist-most-albums-in-top-10': 'artistMostAlbumsInTop10',
    'artist-most-songs-charted': 'artistMostSongsCharted',
    'artist-most-albums-charted': 'artistMostAlbumsCharted',
  }
  return mapping[recordType] || recordType
}

interface RankedEntry {
  rank: number
  entryKey: string
  name: string
  artist: string | null
  slug: string
  value: number
  weekStart?: string | null
}

interface RecordDetailClientProps {
  groupId: string
  recordType: string
}

export default function RecordDetailClient({ groupId, recordType }: RecordDetailClientProps) {
  const t = useSafeTranslations('records.detail')
  const tTabs = useSafeTranslations('records.tabs')
  const tChartRecords = useSafeTranslations('records.chartRecords')
  
  const isArtistSpecific = isArtistSpecificRecordType(recordType)
  const isPeakWeeklyRecord = recordType === 'most-vs-in-single-week' || recordType === 'most-plays-in-single-week'

  // Get tab from hash fragment (e.g., #artists) - only for non-artist-specific records
  const getTabFromHash = (): ChartType | null => {
    if (typeof window === 'undefined' || isArtistSpecific) return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
    return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
  }
  
  const defaultTab: ChartType = 'artists'
  const [activeTab, setActiveTab] = useState<ChartType>(defaultTab)

  const tabs: TabItem[] = isArtistSpecific ? [] : [
    { id: 'artists', label: tTabs('artists'), icon: faMicrophone },
    { id: 'tracks', label: tTabs('tracks'), icon: faMusic },
    { id: 'albums', label: tTabs('albums'), icon: faCompactDisc },
  ]

  // Initialize tab from hash on mount - only for non-artist-specific records
  useEffect(() => {
    if (isArtistSpecific) return
    const getTabFromHash = (): ChartType | null => {
      if (typeof window === 'undefined' || isArtistSpecific) return null
      const hash = window.location.hash.slice(1) // Remove the #
      const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
      return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
    }
    const tabFromHash = getTabFromHash()
    if (tabFromHash) {
      setActiveTab(tabFromHash)
    }
  }, [isArtistSpecific])

  // Handle hash changes from external sources (browser back/forward, direct links) - only for non-artist-specific records
  useEffect(() => {
    if (isArtistSpecific) return
    
    const getTabFromHash = (): ChartType | null => {
      if (typeof window === 'undefined' || isArtistSpecific) return null
      const hash = window.location.hash.slice(1) // Remove the #
      const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
      return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
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
  }, [activeTab, isArtistSpecific, defaultTab])

  // Update hash when tab changes (but only if hash doesn't already match) - only for non-artist-specific records
  const handleTabChange = (tabId: string) => {
    if (isArtistSpecific) return
    
    const newTab = tabId as ChartType
    setActiveTab(newTab)
    
    // Update hash without triggering hashchange event
    if (typeof window !== 'undefined') {
      const newHash = `#${newTab}`
      if (window.location.hash !== newHash) {
        // Use replaceState to avoid adding to history
        window.history.replaceState(null, '', `${window.location.pathname}${newHash}`)
      }
    }
  }

  // For artist-specific records, don't include type parameter (API always returns artists)
  const fetchUrl = isArtistSpecific
    ? `/api/groups/${groupId}/records/${recordType}`
    : `/api/groups/${groupId}/records/${recordType}?type=${activeTab}`

  // Track which tab the current displayed data belongs to
  const [displayedTab, setDisplayedTab] = useState<ChartType>(activeTab)
  const [displayedEntries, setDisplayedEntries] = useState<RankedEntry[]>([])
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsFetching(true)

    fetch(fetchUrl)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        const filtered = (data?.entries || []).filter((entry: RankedEntry) => entry.value > 0)
        setDisplayedEntries(filtered)
        setDisplayedTab(activeTab)
        setIsFetching(false)
      })
      .catch(() => {
        if (cancelled) return
        setDisplayedEntries([])
        setIsFetching(false)
      })

    return () => { cancelled = true }
  }, [fetchUrl, activeTab])

  const entries = displayedEntries
  const showLoading = isFetching || displayedTab !== activeTab
  const error = null

  const getEntryLink = (entry: RankedEntry) => {
    // Artist-specific records always link to artist pages
    const chartTypePath = isArtistSpecific ? 'artist' : (activeTab === 'artists' ? 'artist' : activeTab === 'tracks' ? 'track' : 'album')
    return `/groups/${groupId}/charts/${chartTypePath}/${entry.slug}`
  }

  const formatValue = (value: number) => {
    // For numeric values, add commas and suffix based on record type
    if (typeof value === 'number') {
      const isVS = recordType === 'most-vs-in-single-week' || recordType === 'most-total-vs'
      const formatted = isVS
        ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : value.toLocaleString()
      if (isVS) {
        return `${formatted} VS`
      }
      if (recordType === 'most-plays-in-single-week' || recordType === 'most-plays') {
        return `${formatted} plays`
      }
      return formatted
    }
    return value
  }

  const displayName = tChartRecords(getRecordTypeTranslationKey(recordType)) || recordType

  return (
    <div className="mt-4 md:mt-6 lg:mt-8">
      {/* Big colorful title */}
      <div className="mb-4 md:mb-6 lg:mb-8 text-center px-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--theme-primary)] mb-2 md:mb-3">
          {displayName}
        </h1>
      </div>

      {/* Centered tabs - only show for non-artist-specific records */}
      {!isArtistSpecific && tabs.length > 0 && (
        <div className="flex justify-center mb-4 md:mb-6 lg:mb-8 px-2">
          <LiquidGlassTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}

      {showLoading ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl md:text-3xl lg:text-4xl text-[var(--theme-primary)]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 md:p-6 text-center mx-2 md:mx-0">
          <p className="text-red-700 dark:text-red-300 text-sm md:text-base">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme mx-2 md:mx-0">
          <p className="text-[var(--text-secondary)] text-sm md:text-base">{t('noEntries')}</p>
        </div>
      ) : (
        <div 
          className="bg-[var(--surface-card)] rounded-lg shadow-lg overflow-hidden mx-2 md:mx-0"
          style={{
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            isolation: 'isolate',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--surface-base)] sticky top-0 z-10">
                <tr>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-12 sm:w-24 md:w-32">
                    {t('rank')}
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('entry')}
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-16 sm:w-24 md:w-32">
                    {t('value')}
                  </th>
                  {isPeakWeeklyRecord && (
                    <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-24 sm:w-32 md:w-40">
                      {t('week')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {entries.map((entry) => (
                  <tr key={entry.entryKey} className="hover:bg-[var(--surface-base)] transition-colors">
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <span className="font-bold text-[var(--text-primary)]">#{entry.rank}</span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <div className="min-w-0 max-w-[100px] sm:max-w-none">
                        <Link
                          href={getEntryLink(entry)}
                          className="font-medium text-[var(--text-primary)] hover:text-[var(--theme-primary-dark)] transition-colors block truncate"
                          title={entry.name}
                        >
                          {entry.name}
                        </Link>
                        {entry.artist && (
                          <div className="text-[var(--text-muted)] text-xs mt-0.5 sm:mt-1 truncate" title={`${t('by')} ${entry.artist}`}>
                            {t('by')} {entry.artist}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                      <span className="text-[var(--text-primary)] font-medium">{formatValue(entry.value)}</span>
                    </td>
                    {isPeakWeeklyRecord && (
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                        {entry.weekStart ? (
                          <Link
                            href={`/groups/${groupId}/charts?week=${formatChartWeekDate(new Date(entry.weekStart))}`}
                            className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] transition-colors text-xs sm:text-sm"
                          >
                            {formatChartWeekLabel(new Date(entry.weekStart))}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
