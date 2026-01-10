'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMusic, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
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

export default function ChartToppersClient({ groupId }: ChartToppersClientProps) {
  const t = useSafeTranslations('chartToppers')
  const tTabs = useSafeTranslations('chartToppers.tabs')
  
  // Get tab from hash fragment (e.g., #artists)
  const getTabFromHash = (): ChartType | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
    return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
  }
  
  const defaultTab: ChartType = 'artists'
  const [activeTab, setActiveTab] = useState<ChartType>(defaultTab)
  const [entries, setEntries] = useState<ChartTopperEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showVS, setShowVS] = useState(false)

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

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const url = `/api/groups/${groupId}/chart-toppers?type=${activeTab}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch chart toppers')
        }
        
        const data = await response.json()
        setEntries(data.entries || [])
        setShowVS(data.showVS || false)
      } catch (err) {
        console.error('Error fetching chart toppers:', err)
        setError(t('error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntries()
  }, [groupId, activeTab, t])

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
    <div className="mt-6 md:mt-8">
      {/* Big colorful title */}
      <div className="mb-6 md:mb-8 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--theme-primary)] mb-2 md:mb-3">
          {t('title')}
        </h1>
      </div>

      {/* Centered tabs */}
      <div className="flex justify-center mb-6 md:mb-8">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 text-center">
          <p className="text-red-700 text-sm md:text-base">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
          <p className="text-gray-600 text-sm md:text-base">{t('noEntries')}</p>
        </div>
      ) : (
        <div 
          className="bg-white rounded-lg shadow-lg overflow-hidden"
          style={{ 
            backgroundColor: '#ffffff', 
            backdropFilter: 'none', 
            WebkitBackdropFilter: 'none',
            isolation: 'isolate',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-48">
                      {t('week')}
                    </th>
                    <th className="px-2 md:px-6 py-2 md:py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {t('entry')}
                    </th>
                    <th className="px-2 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                      {t('plays')}
                    </th>
                    <th className="px-2 md:px-6 py-2 md:py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                      {t('value')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={`${entry.weekStart}-${entry.entryKey}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 md:px-6 py-2 md:py-3 text-sm">
                        <span className="text-gray-900">{entry.weekStartFormatted}</span>
                      </td>
                      <td className="px-2 md:px-6 py-2 md:py-3 text-sm">
                        <div>
                          <Link
                            href={getEntryLink(entry)}
                            className="font-medium text-gray-900 hover:text-[var(--theme-primary-dark)] transition-colors"
                          >
                            {entry.name}
                          </Link>
                          {entry.artist && (
                            <div className="text-gray-500 text-xs mt-0.5">by {entry.artist}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-2 md:py-3 text-sm text-right">
                        <span className="text-gray-900 font-medium">{entry.playcount.toLocaleString()}</span>
                      </td>
                      <td className="px-2 md:px-6 py-2 md:py-3 text-sm text-right">
                        <span className="text-gray-900 font-medium">{formatValue(entry.value, entry.isVS)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

