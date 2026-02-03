'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faFire, faCalendarDays, faChartLine, faHeart } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { Link } from '@/i18n/routing'

interface GroupQuickStatsProps {
  groupId: string
}

export default function GroupQuickStats({ groupId }: GroupQuickStatsProps) {
  const t = useSafeTranslations('groups.quickStats')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRainbowTheme, setIsRainbowTheme] = useState(false)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/quick-stats`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setIsLoading(false)
        console.error('Error fetching quick stats:', err)
      })
  }, [groupId])

  useEffect(() => {
    // Check if the page has the rainbow theme class
    const mainElement = document.querySelector('main.theme-rainbow')
    setIsRainbowTheme(!!mainElement)
  }, [])

  if (isLoading) {
    return (
      <div className="relative z-10 mt-3 md:mt-6">
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

  const { weeksTracked, chartMode, obsessionArtist } = data

  return (
    <div className="relative z-10 mt-3 md:mt-6">
      <div 
        className="rounded-xl md:rounded-2xl border border-white/30 overflow-hidden"
        style={{
          background: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        {/* 3-column grid that fits on mobile */}
        <div className="grid grid-cols-3 divide-x divide-white/30">
          {/* Obsession Stat */}
          <div className="p-2 md:p-5 flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-4">
            <div className="flex-shrink-0 w-7 h-7 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
              <FontAwesomeIcon 
                icon={isRainbowTheme ? faHeart : faFire} 
                className="text-white text-xs md:text-xl" 
              />
            </div>
            <div className="flex-1 min-w-0 text-center md:text-left">
              <div className="text-[8px] md:text-xs text-white/70 uppercase tracking-wider font-semibold mb-0.5 md:mb-1">
                {isRainbowTheme ? t('mother') : t('obsession')}
              </div>
              {obsessionArtist ? (
                <>
                  <div className="text-[11px] md:text-lg font-bold text-white truncate drop-shadow-sm">{obsessionArtist.name}</div>
                  <div className="hidden md:flex items-center gap-1 mt-1">
                    <div className="flex gap-0.5">
                      {[...Array(Math.min(obsessionArtist.weeks, 5))].map((_, i) => (
                        <div 
                          key={i} 
                          className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                        />
                      ))}
                      {obsessionArtist.weeks > 5 && (
                        <span className="text-xs text-white/60 ml-0.5">+{obsessionArtist.weeks - 5}</span>
                      )}
                    </div>
                    <span className="text-xs text-white/70">
                      {obsessionArtist.weeks === 1 ? t('weekStreak', { count: obsessionArtist.weeks }) : t('weeksStreak', { count: obsessionArtist.weeks })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] md:text-sm font-medium text-white/60">{t('noDataYet')}</div>
              )}
            </div>
          </div>

          {/* Weeks Tracked Stat */}
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

          {/* Chart Mode Stat */}
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
              {(chartMode === 'vs' || chartMode === 'vs_weighted') && (
                <Link
                  href="/faq#what-is-the-vibe-score-vs"
                  className="hidden md:inline-flex text-xs text-white/80 hover:text-white hover:underline transition-colors items-center gap-1 mt-0.5"
                >
                  {t('whatIsVS')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

