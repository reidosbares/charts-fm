'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faMusic, faCalendarDays, faChartLine } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface PublicGroupQuickStatsProps {
  groupId: string
}

export default function PublicGroupQuickStats({ groupId }: PublicGroupQuickStatsProps) {
  const t = useSafeTranslations('groups.quickStats')
  const tWeekly = useSafeTranslations('groups.weeklyCharts')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/public/weekly-charts`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setIsLoading(false)
        console.error('Error fetching public weekly charts for quick stats:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div className="relative z-10">
        <div
          className="rounded-xl md:rounded-2xl p-2 md:p-5 border border-white/30"
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          }}
        >
          <div className="flex items-center justify-center py-3 md:py-4">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-base md:text-2xl text-white" />
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.weeksTracked === 0) {
    return null
  }

  const { weeksTracked, chartMode, totalPlaysThisWeek } = data

  return (
    <div className="relative z-10">
      <div
        className="rounded-xl md:rounded-2xl border border-white/30 overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div className="grid grid-cols-3 divide-x divide-white/30">
          {/* Plays this week */}
          <div className="p-2 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-4">
            <div className="flex-shrink-0 w-7 h-7 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[var(--theme-primary-light)] to-[var(--theme-primary)] flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faMusic} className="text-[var(--theme-button-text)] text-xs md:text-xl" />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="text-[8px] md:text-xs text-white/70 uppercase tracking-wider font-semibold mb-0.5 md:mb-1">
                {tWeekly('public.totalPlaysThisWeek')}
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-0.5 md:gap-1">
                <span className="text-base md:text-3xl font-bold text-white drop-shadow-sm">
                  {(totalPlaysThisWeek ?? 0).toLocaleString()}
                </span>
                <span className="text-[9px] md:text-sm text-white/70 font-medium">{t('plays')}</span>
              </div>
            </div>
          </div>

          {/* Weeks Tracked */}
          <div className="p-2 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-4">
            <div className="flex-shrink-0 w-7 h-7 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[var(--theme-primary-light)] to-[var(--theme-primary)] flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faCalendarDays} className="text-[var(--theme-button-text)] text-xs md:text-xl" />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="text-[8px] md:text-xs text-white/70 uppercase tracking-wider font-semibold mb-0.5 md:mb-1">
                {t('weeksTracked')}
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-0.5 md:gap-1">
                <span className="text-base md:text-3xl font-bold text-white drop-shadow-sm">{weeksTracked}</span>
                <span className="text-[9px] md:text-sm text-white/70 font-medium">{t('weeks')}</span>
              </div>
            </div>
          </div>

          {/* Chart Mode */}
          <div className="p-2 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-4">
            <div className="flex-shrink-0 w-7 h-7 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon icon={faChartLine} className="text-white text-xs md:text-xl" />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="text-[8px] md:text-xs text-white/70 uppercase tracking-wider font-semibold mb-0.5 md:mb-1">
                {t('chartMode')}
              </div>
              <div className="text-[11px] md:text-lg font-bold text-white drop-shadow-sm">
                {chartMode === 'vs' ? t('vibeScore') : chartMode === 'vs_weighted' ? t('vibeScoreWeighted') : t('playsOnly')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
