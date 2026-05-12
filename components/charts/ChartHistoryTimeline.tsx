'use client'

import { memo, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { ChartHistoryEntry } from '@/lib/chart-deep-dive'
import PositionBubble from './PositionBubble'
import { getChartWeekReferenceDate } from '@/lib/weekly-utils'
import Tooltip from '@/components/Tooltip'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ChartHistoryTimelineProps {
  history: ChartHistoryEntry[]
  groupId: string
  chartType: 'artists' | 'tracks' | 'albums'
  /** If false, append an OUT bubble + ellipsis to indicate the entry has dropped off. */
  isCurrentlyCharting?: boolean
}

interface TimelineSegment {
  type: 'streak' | 'gap' | 'single-out'
  weeks?: ChartHistoryEntry[]
  gapWeeks?: number
  gapWeekStart?: Date // For single-out, the week that was missed
}

function ChartHistoryTimeline({
  history,
  groupId,
  chartType,
  isCurrentlyCharting = true,
}: ChartHistoryTimelineProps) {
  const t = useSafeTranslations('deepDive.timeline')
  const locale = useLocale()
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    [locale]
  )
  // Memoize expensive timeline processing
  const { timelineItems, firstAppearanceDate } = useMemo(() => {
    if (history.length === 0) {
      return { timelineItems: [], firstAppearanceDate: null }
    }

    // Get first appearance date
    const firstAppearanceDate = history[0]?.weekStart

    // Group history into consecutive streaks and gaps
    const segments: TimelineSegment[] = []
    let currentStreak: ChartHistoryEntry[] = [history[0]]

    for (let i = 1; i < history.length; i++) {
      const prevWeek = history[i - 1].weekStart
      const currentWeek = history[i].weekStart
      const daysDiff = (currentWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24)

      if (daysDiff <= 7) {
        // Consecutive week (within 7 days)
        currentStreak.push(history[i])
      } else {
        // Gap detected
        // Save current streak
        if (currentStreak.length > 0) {
          segments.push({ type: 'streak', weeks: [...currentStreak] })
        }

        // Calculate gap weeks
        const gapWeeks = Math.round(daysDiff / 7) - 1

        if (gapWeeks === 1) {
          // Single week gap - show OUT bubble
          // Calculate the week that was missed (7 days after previous week)
          const gapWeekStart = new Date(prevWeek)
          gapWeekStart.setUTCDate(gapWeekStart.getUTCDate() + 7)
          segments.push({ type: 'single-out', gapWeekStart })
        } else {
          // Multiple weeks gap - show text
          segments.push({ type: 'gap', gapWeeks })
        }

        // Start new streak
        currentStreak = [history[i]]
      }
    }

    // Add final streak
    if (currentStreak.length > 0) {
      segments.push({ type: 'streak', weeks: currentStreak })
    }

    // Flatten all timeline items for rendering
    interface TimelineItem {
      type: 'bubble' | 'gap-text'
      entry?: ChartHistoryEntry
      gapWeekStart?: Date
      gapWeeks?: number
      isOut?: boolean
      isFirst?: boolean
    }

    const timelineItems: TimelineItem[] = []
    let isFirstItem = true

    segments.forEach((segment) => {
      if (segment.type === 'streak' && segment.weeks) {
        segment.weeks.forEach((entry) => {
          timelineItems.push({
            type: 'bubble',
            entry,
            isFirst: isFirstItem,
          })
          isFirstItem = false
        })
      } else if (segment.type === 'single-out' && segment.gapWeekStart) {
        timelineItems.push({
          type: 'bubble',
          gapWeekStart: segment.gapWeekStart,
          isOut: true,
          isFirst: isFirstItem,
        })
        isFirstItem = false
      } else if (segment.type === 'gap' && segment.gapWeeks) {
        timelineItems.push({
          type: 'gap-text',
          gapWeeks: segment.gapWeeks,
        })
      }
    })

    return { timelineItems, firstAppearanceDate }
  }, [history])

  if (history.length === 0) {
    return (
      <div className="bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] backdrop-blur-xl rounded-xl p-6 md:p-8 text-center border border-white/30 dark:border-white/10">
        <p className="text-sm md:text-base text-[var(--text-secondary)]">{t('noHistory')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30 dark:border-white/10" style={{ overflow: 'visible', contain: 'layout style paint' }}>
      <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)] mb-4 md:mb-6">{t('title')}</h2>
      <div className="relative" style={{ overflow: 'visible' }}>
        <div
          className="relative flex flex-wrap items-center gap-1.5 md:gap-2.5 pb-8 md:pb-12 pl-4 md:pl-8"
          style={{
            zIndex: 1,
            overflow: 'visible',
          }}
        >
          {timelineItems.map((item, index) => {
            if (item.type === 'bubble') {
              return (
                <div 
                  key={`${item.entry?.weekStart?.getTime() || item.gapWeekStart?.getTime()}-${index}`} 
                  className="relative flex flex-col items-center" 
                  style={{ overflow: 'visible', contain: 'layout style' }}
                >
                  <PositionBubble
                    position={item.entry?.position || 0}
                    weekStart={item.entry?.weekStart || item.gapWeekStart!}
                    groupId={groupId}
                    chartType={chartType}
                    playcount={item.entry?.playcount}
                    vibeScore={item.entry?.vibeScore}
                    isOut={item.isOut}
                  />
                  {item.isFirst && firstAppearanceDate && (
                    <span className="absolute bottom-full mb-1 md:mb-2 left-1/2 -translate-x-1/2 text-[10px] md:text-xs text-[var(--text-secondary)] font-medium whitespace-nowrap">
                      {dateFormatter.format(getChartWeekReferenceDate(firstAppearanceDate))}
                    </span>
                  )}
                </div>
              )
            } else if (item.type === 'gap-text') {
              return (
                <Tooltip
                  key={`gap-${index}`}
                  content={item.gapWeeks === 1 ? t('outFor', { count: item.gapWeeks }) : t('outForPlural', { count: item.gapWeeks })}
                  position="top"
                >
                  <div
                    className="w-11 h-11 md:w-14 md:h-14 text-xs md:text-sm text-[var(--text-muted)] opacity-70 rounded-full font-semibold flex items-center justify-center bg-white/20 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] border border-dashed border-[var(--border-strong)] backdrop-blur-sm relative z-10 inline-flex cursor-help whitespace-nowrap"
                    style={{ contain: 'layout style' }}
                  >
                    ⏸ {item.gapWeeks}
                  </div>
                </Tooltip>
              )
            }
            return null
          })}
          {!isCurrentlyCharting && (
            <>
              <div className="w-11 h-11 md:w-14 md:h-14 text-xs md:text-sm text-[var(--text-muted)] opacity-70 rounded-full font-semibold flex items-center justify-center bg-white/20 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] border border-dashed border-[var(--border-strong)] backdrop-blur-sm relative z-10 inline-flex">
                OUT
              </div>
              <span className="text-lg md:text-xl text-[var(--text-muted)] opacity-70 leading-none select-none" aria-hidden="true">
                …
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(ChartHistoryTimeline)

