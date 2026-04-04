'use client'

import { memo, useMemo, useCallback } from 'react'
import { EntryStats } from '@/lib/chart-deep-dive'
import { formatChartWeekLabel, formatWeekLabel, getChartWeekReferenceDate } from '@/lib/weekly-utils'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface CertificationCounts {
  gold: number
  platinum: number
  diamond: number
}

interface EntryStatsTableProps {
  stats: EntryStats
  certificationCounts?: CertificationCounts
}

const TIER_COLORS: Record<string, { fill: string; stroke: string; shine: string }> = {
  gold: { fill: '#D4A017', stroke: '#B8860B', shine: '#FFD700' },
  platinum: { fill: '#A8B4C0', stroke: '#8899AA', shine: '#D4DEE8' },
  diamond: { fill: '#7BD4F0', stroke: '#5BACC8', shine: '#B8EAFF' },
}

function Disc({ tier }: { tier: string }) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.gold
  return (
    <svg width={14} height={12} viewBox="0 0 14 12" className="inline-block flex-shrink-0">
      <ellipse cx={7} cy={6} rx={6} ry={5} fill={colors.fill} stroke={colors.stroke} strokeWidth={0.8} />
      <circle cx={7} cy={6} r={1.5} fill={colors.stroke} opacity={0.6} />
      <ellipse cx={6} cy={4.5} rx={2.7} ry={1.5} fill={colors.shine} opacity={0.5} />
    </svg>
  )
}

function EntryStatsTable({ stats, certificationCounts }: EntryStatsTableProps) {
  const t = useSafeTranslations('deepDive.entryStats')
  const formatDaysAgo = useCallback((date: Date | null): string => {
    if (!date) return t('never')
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return t('today')
    if (diffDays === 1) return t('dayAgo')
    return t('daysAgo', { count: diffDays })
  }, [t])

  const calculateWeeksAgo = (refDate: Date): number => {
    const now = new Date()
    const diffTime = now.getTime() - refDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  }

  const formatDebutDate = useCallback((date: Date | null) => {
    if (!date) return t('notAvailable')
    const ref = getChartWeekReferenceDate(date)
    const formattedDate = formatWeekLabel(ref)
    const weeksAgo = calculateWeeksAgo(ref)
    
    return (
      <>
        {formattedDate}
        <span className="text-gray-500 font-normal">
          {' '}({weeksAgo === 1 ? t('weeksAgo', { count: weeksAgo }) : t('weeksAgoPlural', { count: weeksAgo })})
        </span>
      </>
    )
  }, [t])

  const formatStreakDates = (startDate: Date | null, endDate: Date | null): string | null => {
    if (!startDate || !endDate) return null

    const startFormatted = formatChartWeekLabel(startDate)
    const endFormatted = formatChartWeekLabel(endDate)

    if (startDate.getTime() === endDate.getTime()) {
      return startFormatted
    }

    return `${startFormatted} - ${endFormatted}`
  }

  // Memoize table data to prevent recalculation on every render
  const tableData = useMemo(() => [
    {
      label: t('peakPosition'),
      value: `#${stats.peakPosition}${stats.weeksAtPeak > 1 ? ` (${stats.weeksAtPeak} ${stats.weeksAtPeak === 1 ? t('week') : t('weeks')})` : ''}`,
    },
    {
      label: t('debutPosition'),
      value: `#${stats.debutPosition}`,
    },
    {
      label: t('debutDate'),
      value: formatDebutDate(stats.debutDate),
    },
    {
      label: t('weeksInTop10'),
      value: stats.weeksInTop10.toString(),
    },
    {
      label: t('weeksCharting'),
      value: stats.totalWeeksCharting.toString(),
    },
    {
      label: t('longestStreak'),
      value: (
        <>
          {`${stats.longestStreak} ${stats.longestStreak !== 1 ? t('weeks') : t('week')}${stats.isStreakOngoing ? ' 🔥' : ''}`}
          {formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate) && (
            <span className="text-gray-500 font-normal">
              {' '}({formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate)})
            </span>
          )}
        </>
      ),
    },
    {
      label: t('latestAppearance'),
      value: stats.currentlyCharting
        ? t('currentlyCharting')
        : formatDaysAgo(
            stats.latestAppearance ? getChartWeekReferenceDate(stats.latestAppearance) : null
          ),
    },
  ], [stats, t, formatDaysAgo, formatDebutDate])

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{t('title')}</h2>
      <table className="w-full">
        <tbody className="divide-y divide-gray-200/50">
          {tableData.map((row, index) => (
            <tr key={index} className="hover:bg-white/20 transition-colors">
              <td className="py-2 md:py-3 px-2 md:px-4 text-sm font-medium text-gray-700 w-1/2">
                {row.label}
              </td>
              <td className="py-2 md:py-3 px-2 md:px-4 text-sm text-gray-900 font-semibold">
                {row.value}
              </td>
            </tr>
          ))}
          {certificationCounts && (
            <tr className="hover:bg-white/20 transition-colors">
              <td className="py-2 md:py-3 px-2 md:px-4 text-sm font-medium text-gray-700 w-1/2">
                {t('certifications')}
              </td>
              <td className="py-2 md:py-3 px-2 md:px-4 text-sm text-gray-900 font-semibold">
                <span className="inline-flex items-center gap-3">
                  {(['diamond', 'platinum', 'gold'] as const).map(tier => (
                    <span key={tier} className="inline-flex items-center gap-1">
                      <Disc tier={tier} />
                      <span>x{certificationCounts[tier]}</span>
                    </span>
                  ))}
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default memo(EntryStatsTable)

