'use client'

import { useState } from 'react'

type Tab = 'charts' | 'members' | 'alltime'

interface GroupTabsProps {
  defaultTab?: Tab
  membersContent: React.ReactNode
  chartsContent: React.ReactNode
  allTimeContent: React.ReactNode
}

export default function GroupTabs({ 
  defaultTab = 'charts', 
  membersContent, 
  chartsContent,
  allTimeContent
}: GroupTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b-2 border-yellow-200/50 mb-6">
        <nav className="flex space-x-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('charts')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'charts'
                  ? 'border-yellow-500 text-yellow-700 bg-gradient-to-b from-yellow-50 to-transparent shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/50'
              }
            `}
          >
            <span className="text-lg">📊</span>
            Weekly Charts
          </button>
          <button
            onClick={() => setActiveTab('alltime')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'alltime'
                  ? 'border-yellow-500 text-yellow-700 bg-gradient-to-b from-yellow-50 to-transparent shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/50'
              }
            `}
          >
            <span className="text-lg">🏆</span>
            All-Time Stats
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'members'
                  ? 'border-yellow-500 text-yellow-700 bg-gradient-to-b from-yellow-50 to-transparent shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-yellow-600 hover:bg-yellow-50/50'
              }
            `}
          >
            <span className="text-lg">👥</span>
            Members
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'charts' && chartsContent}
        {activeTab === 'alltime' && allTimeContent}
        {activeTab === 'members' && membersContent}
      </div>
    </div>
  )
}

