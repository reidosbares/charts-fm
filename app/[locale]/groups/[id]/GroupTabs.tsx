'use client'

import { useState, useMemo, useEffect } from 'react'
import { faChartBar, faTrophy, faUsers, faFire } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

type Tab = 'charts' | 'members' | 'alltime' | 'trends'

interface GroupTabsProps {
  defaultTab?: Tab
  membersContent: React.ReactNode | null
  chartsContent: React.ReactNode
  allTimeContent: React.ReactNode
  trendsContent?: React.ReactNode
  pendingRequestsCount?: number
  isMember?: boolean
}

export default function GroupTabs({ 
  defaultTab = 'trends', 
  membersContent, 
  chartsContent,
  allTimeContent,
  trendsContent,
  pendingRequestsCount = 0,
  isMember = true
}: GroupTabsProps) {
  const t = useSafeTranslations('groups.tabs')
  
  // Get tab from hash fragment (e.g., #charts)
  const getTabFromHash = (): Tab | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: Tab[] = isMember 
      ? ['charts', 'members', 'alltime', 'trends']
      : ['charts', 'alltime', 'trends']
    return validTabs.includes(hash as Tab) ? (hash as Tab) : null
  }
  
  // Initialize with defaultTab, then check hash on mount
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  
  // Check hash fragment on mount and when hash changes
  useEffect(() => {
    const getTabFromHash = (): Tab | null => {
      if (typeof window === 'undefined') return null
      const hash = window.location.hash.slice(1) // Remove the #
      const validTabs: Tab[] = isMember 
        ? ['charts', 'members', 'alltime', 'trends']
        : ['charts', 'alltime', 'trends']
      return validTabs.includes(hash as Tab) ? (hash as Tab) : null
    }
    
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
  }, [activeTab, defaultTab, isMember])
  
  // Update hash when tab changes (no page refresh, preserves scroll position)
  const handleTabChange = (tabId: string) => {
    const tab = tabId as Tab
    setActiveTab(tab)
    // Update hash without causing page refresh or scroll
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
  }

  const tabs: TabItem[] = useMemo(() => {
    const baseTabs: TabItem[] = [
      { id: 'trends', label: t('trends'), icon: faFire },
      { id: 'charts', label: t('weeklyCharts'), icon: faChartBar },
      { id: 'alltime', label: t('allTimeStats'), icon: faTrophy },
    ]
    
    // Only include members tab if user is a member
    if (isMember) {
      baseTabs.push({ id: 'members', label: t('members'), icon: faUsers, badge: pendingRequestsCount })
    }
    
    return baseTabs
  }, [t, pendingRequestsCount, isMember])

  return (
    <div className="mt-6 md:mt-10">
      {/* Tab Navigation */}
      <div className="mb-4 md:mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          variant="dark"
        />
      </div>

      {/* Trends, Charts, and All-time: content floats outside container, premium glass cards inside */}
      {activeTab === 'trends' && (
        <div className="min-w-0">
          {trendsContent}
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="min-w-0">
          {chartsContent}
        </div>
      )}

      {activeTab === 'alltime' && (
        <div className="min-w-0">
          {allTimeContent}
        </div>
      )}

      {/* Members: inside glass container */}
      {isMember && activeTab === 'members' && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-4 md:p-6 border border-white/50 shadow-lg">
          {membersContent}
        </div>
      )}
    </div>
  )
}

