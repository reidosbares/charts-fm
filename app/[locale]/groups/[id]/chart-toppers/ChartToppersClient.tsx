'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMusic, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useLocale } from 'next-intl'
import { ChartType } from '@/lib/chart-slugs'

interface ChartTopperEntry {
  weekStart: string
  weekStartFormatted: string
  entryKey: string
  name: string
  artist: string | null
  slug: string
  value: number
  isVS: boolean
  playcount: number
}

interface ChartToppersClientProps {
  groupId: string
}

const IMAGE_BATCH_SIZE = 20

/** Loads artist or album image async when shouldLoad is true, styled like MVP table profile picture */
function ChartTopperEntryImage({
  chartType,
  name,
  artist,
  shouldLoad,
}: {
  chartType: ChartType
  name: string
  artist: string | null
  shouldLoad: boolean
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!shouldLoad) {
      setLoading(false)
      setImageUrl(null)
      return
    }
    let cancelled = false
    setImageUrl(null)
    setLoading(true)

    const fetchImage = async () => {
      try {
        if (chartType === 'artists') {
          const res = await fetch(`/api/images/artist?artist=${encodeURIComponent(name)}`)
          const data = await res.json()
          if (!cancelled) setImageUrl(data.imageUrl || null)
        } else if (chartType === 'albums' && artist) {
          const res = await fetch(
            `/api/images/album?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(name)}`
          )
          const data = await res.json()
          if (!cancelled) setImageUrl(data.imageUrl || null)
        } else if (chartType === 'tracks' && artist) {
          const res = await fetch(`/api/images/artist?artist=${encodeURIComponent(artist)}`)
          const data = await res.json()
          if (!cancelled) setImageUrl(data.imageUrl || null)
        } else {
          if (!cancelled) setImageUrl(null)
        }
      } catch {
        if (!cancelled) setImageUrl(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchImage()
    return () => { cancelled = true }
  }, [chartType, name, artist, shouldLoad])

  return (
    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-[rgb(var(--theme-primary-rgb)/0.1)] ring-1 ring-[var(--theme-border)]">
      {loading ? (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
      ) : imageUrl ? (
        <SafeImage
          src={imageUrl}
          alt={name}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
      )}
    </div>
  )
}

export default function ChartToppersClient({ groupId }: ChartToppersClientProps) {
  const t = useSafeTranslations('chartToppers')
  const tTabs = useSafeTranslations('chartToppers.tabs')
  const locale = useLocale()
  
  // Get tab from hash fragment (e.g., #artists)
  const getTabFromHash = (): ChartType | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
    return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
  }
  
  const defaultTab: ChartType = 'artists'
  const [activeTab, setActiveTab] = useState<ChartType>(defaultTab)
  const [visibleImageCount, setVisibleImageCount] = useState(IMAGE_BATCH_SIZE)
  const sentinelRef = useRef<HTMLTableRowElement>(null)

  const { data: chartData, error: fetchError, isLoading } = useSWR<any>(
    `/api/groups/${groupId}/chart-toppers?type=${activeTab}`
  )
  const entries: ChartTopperEntry[] = chartData?.entries || []
  const showVS: boolean = chartData?.showVS || false
  const error = fetchError ? t('error') : null

  const totalCountRef = useRef(entries.length)
  totalCountRef.current = entries.length

  // Reset visible image count when entries or tab change
  useEffect(() => {
    setVisibleImageCount(IMAGE_BATCH_SIZE)
  }, [entries.length, activeTab])

  // Load more images when sentinel scrolls into view
  useEffect(() => {
    if (entries.length <= IMAGE_BATCH_SIZE) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (!observerEntries[0]?.isIntersecting) return
        const total = totalCountRef.current
        setVisibleImageCount((prev) => Math.min(prev + IMAGE_BATCH_SIZE, total))
      },
      { root: null, rootMargin: '100px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [entries.length])

  const tabs: TabItem[] = [
    { id: 'artists', label: tTabs('artists'), icon: faMicrophone },
    { id: 'tracks', label: tTabs('tracks'), icon: faMusic },
    { id: 'albums', label: tTabs('albums'), icon: faCompactDisc },
  ]

  // Initialize tab from hash on mount
  useEffect(() => {
    const tabFromHash = getTabFromHash()
    if (tabFromHash) {
      setActiveTab(tabFromHash)
    }
  }, [])

  // Handle hash changes from external sources (browser back/forward, direct links)
  useEffect(() => {
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
  }, [activeTab])

  // Update hash when tab changes (but only if hash doesn't already match)
  const handleTabChange = (tabId: string) => {
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

  const getEntryLink = (entry: ChartTopperEntry) => {
    const chartTypePath = activeTab === 'artists' ? 'artist' : activeTab === 'tracks' ? 'track' : 'album'
    return `/groups/${groupId}/charts/${chartTypePath}/${entry.slug}`
  }

  const formatValue = (value: number, isVS: boolean) => {
    if (isVS) {
      return `${value.toFixed(2)} VS`
    }
    return value.toLocaleString()
  }

  return (
    <div className="mt-4 md:mt-6 lg:mt-8">
      {/* Big colorful title */}
      <div className="mb-4 md:mb-6 lg:mb-8 text-center px-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--theme-primary)] mb-2 md:mb-3">
          {t('title')}
        </h1>
      </div>

      {/* Centered tabs */}
      <div className="flex justify-center mb-4 md:mb-6 lg:mb-8 px-2">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 md:py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl md:text-3xl lg:text-4xl text-[var(--theme-primary)]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 md:p-6 text-center mx-2 md:mx-0">
          <p className="text-red-700 dark:text-red-400 text-sm md:text-base">{error}</p>
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
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-12 sm:w-16 md:w-20">
                    <span className="md:hidden">{locale === 'pt' ? 'sem.' : t('week')}</span>
                    <span className="hidden md:inline">{t('week')}</span>
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-24 sm:w-28 md:w-36">
                    {t('weekOf')}
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('entry')}
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-14 sm:w-20 md:w-32">
                    {t('plays')}
                  </th>
                  <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-14 sm:w-20 md:w-32">
                    {t('value')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {entries.slice(0, visibleImageCount).map((entry, index) => (
                  <tr key={`${entry.weekStart}-${entry.entryKey}`} className="hover:bg-[var(--surface-base)] transition-colors">
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <span className="text-[var(--text-primary)] font-medium" title={entry.weekStartFormatted}>
                        {entries.length - index}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                      {entry.weekStartFormatted}
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChartTopperEntryImage
                          chartType={activeTab}
                          name={entry.name}
                          artist={entry.artist}
                          shouldLoad={true}
                        />
                        <div className="min-w-0 max-w-[100px] sm:max-w-none">
                          <Link
                            href={getEntryLink(entry)}
                            className="font-medium text-[var(--text-primary)] hover:text-[var(--theme-primary-dark)] transition-colors block truncate"
                            title={entry.name}
                          >
                            {entry.name}
                          </Link>
                          {entry.artist && (
                            <div className="text-[var(--text-muted)] text-xs mt-0.5 sm:mt-1 truncate" title={`by ${entry.artist}`}>
                              by {entry.artist}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                      <span className="text-[var(--text-primary)] font-medium">{entry.playcount.toLocaleString()}</span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                      <span className="text-[var(--text-primary)] font-medium">{formatValue(entry.value, entry.isVS)}</span>
                    </td>
                  </tr>
                ))}
                {entries.length > visibleImageCount && (
                  <tr ref={sentinelRef}>
                    <td colSpan={5} className="h-1 p-0 border-0 bg-transparent" aria-hidden />
                  </tr>
                )}
                {entries.slice(visibleImageCount).map((entry, index) => {
                  const globalIndex = visibleImageCount + index
                  return (
                    <tr key={`${entry.weekStart}-${entry.entryKey}`} className="hover:bg-[var(--surface-base)] transition-colors">
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                        <span className="text-[var(--text-primary)] font-medium" title={entry.weekStartFormatted}>
                          {entries.length - globalIndex}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {entry.weekStartFormatted}
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <ChartTopperEntryImage
                            chartType={activeTab}
                            name={entry.name}
                            artist={entry.artist}
                            shouldLoad={false}
                          />
                          <div className="min-w-0 max-w-[100px] sm:max-w-none">
                            <Link
                              href={getEntryLink(entry)}
                              className="font-medium text-[var(--text-primary)] hover:text-[var(--theme-primary-dark)] transition-colors block truncate"
                              title={entry.name}
                            >
                              {entry.name}
                            </Link>
                            {entry.artist && (
                              <div className="text-[var(--text-muted)] text-xs mt-0.5 sm:mt-1 truncate" title={`by ${entry.artist}`}>
                                by {entry.artist}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                        <span className="text-[var(--text-primary)] font-medium">{entry.playcount.toLocaleString()}</span>
                      </td>
                      <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right whitespace-nowrap">
                        <span className="text-[var(--text-primary)] font-medium">{formatValue(entry.value, entry.isVS)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

