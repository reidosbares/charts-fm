'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { faUserPlus, faUsers, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'

interface AdminTabsProps {
  createUserContent: React.ReactNode
  bulkGenerateContent: React.ReactNode
  cleanupContent: React.ReactNode
  userListContent: React.ReactNode
}

type TabId = 'create-user' | 'bulk-generate' | 'cleanup' | 'user-list'

export default function AdminTabs({
  createUserContent,
  bulkGenerateContent,
  cleanupContent,
  userListContent,
}: AdminTabsProps) {
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabId | null
  
  // Validate tab from URL, default to 'create-user' if invalid
  const validTabs: TabId[] = ['create-user', 'bulk-generate', 'cleanup', 'user-list']
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'create-user'
  
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Update active tab when URL changes
  useEffect(() => {
    const validTabs: TabId[] = ['create-user', 'bulk-generate', 'cleanup', 'user-list']
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabId)
    // Update URL without page refresh
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tabId)
    window.history.pushState({}, '', url.toString())
  }

  const tabs: TabItem[] = [
    { id: 'create-user', label: 'Create User', icon: faUserPlus },
    { id: 'bulk-generate', label: 'Bulk Generate', icon: faUsers },
    { id: 'user-list', label: 'User List', icon: faSearch },
    { id: 'cleanup', label: 'Cleanup', icon: faTrash },
  ]

  return (
    <div className="mt-6">
      {/* Tab Navigation */}
      <div className="mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Content */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 md:p-6 border border-theme shadow-sm">
        <div style={{ display: activeTab === 'create-user' ? 'block' : 'none' }}>
          {createUserContent}
        </div>
        <div style={{ display: activeTab === 'bulk-generate' ? 'block' : 'none' }}>
          {bulkGenerateContent}
        </div>
        <div style={{ display: activeTab === 'user-list' ? 'block' : 'none' }}>
          {userListContent}
        </div>
        <div style={{ display: activeTab === 'cleanup' ? 'block' : 'none' }}>
          {cleanupContent}
        </div>
      </div>
    </div>
  )
}
