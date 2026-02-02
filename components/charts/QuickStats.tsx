'use client'

import { memo } from 'react'
import { Link } from '@/i18n/routing'
import { MajorDriver } from '@/lib/chart-deep-dive'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface QuickStatsProps {
  totalVS: number | null
  totalPlays: number
  majorDriver: MajorDriver | null
  chartMode: string
  numberOneTracks?: number
  numberOneAlbums?: number
  weeksAtNumberOne?: number
}

function QuickStats({ totalVS, totalPlays, majorDriver, chartMode, numberOneTracks, numberOneAlbums, weeksAtNumberOne }: QuickStatsProps) {
  const t = useSafeTranslations('deepDive.quickStats')
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'
  const showNumberOnes = numberOneTracks !== undefined || numberOneAlbums !== undefined

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">{t('title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {showVS && totalVS !== null && (
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">{t('totalVS')}</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{totalVS.toFixed(2)}</div>
          </div>
        )}
        <div>
          <div className="text-xs md:text-sm text-gray-600 mb-1">{t('totalPlays')}</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900">{totalPlays.toLocaleString()}</div>
        </div>
        {majorDriver && (
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">{t('majorChartDriver')}</div>
            <Link 
              href={`/u/${encodeURIComponent(majorDriver.lastfmUsername)}`}
              className="text-base md:text-lg font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] active:text-[var(--theme-primary-dark)] transition-colors break-words touch-manipulation"
            >
              {majorDriver.name}
            </Link>
            <div className="text-xs md:text-sm text-gray-500">
              {chartMode === 'plays_only' ? (
                <>{majorDriver.contribution.toLocaleString()} plays</>
              ) : (
                <>{majorDriver.contribution.toFixed(2)} VS</>
              )}
            </div>
          </div>
        )}
        {weeksAtNumberOne !== undefined && (
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">{t('weeksAtNumberOne')}</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{weeksAtNumberOne}</div>
          </div>
        )}
        {showNumberOnes && numberOneTracks !== undefined && (
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">{t('numberOneTracks')}</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{numberOneTracks}</div>
          </div>
        )}
        {showNumberOnes && numberOneAlbums !== undefined && (
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">{t('numberOneAlbums')}</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900">{numberOneAlbums}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(QuickStats)

