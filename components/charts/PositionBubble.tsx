'use client'

import { memo, useMemo } from 'react'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Link } from '@/i18n/routing'
import { formatWeekDate, formatWeekLabel, getChartWeekReferenceDate } from '@/lib/weekly-utils'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface PositionBubbleProps {
  position: number
  weekStart: Date
  groupId: string
  chartType: 'artists' | 'tracks' | 'albums'
  playcount?: number
  vibeScore?: number | null
  isOut?: boolean
}

const SIZE_CLASS = 'w-11 h-11 md:w-14 md:h-14 text-sm md:text-base'

function PositionBubble({
  position,
  weekStart,
  groupId,
  chartType,
  playcount,
  vibeScore,
  isOut = false,
}: PositionBubbleProps) {
  const t = useSafeTranslations('deepDive.timeline')

  const { href, formattedDate } = useMemo(() => {
    const ref = getChartWeekReferenceDate(weekStart)
    return {
      href: `/groups/${groupId}/charts?week=${formatWeekDate(ref)}&type=${chartType}`,
      formattedDate: formatWeekLabel(ref),
    }
  }, [weekStart, groupId, chartType])

  let colorClass: string
  if (isOut) {
    colorClass = 'text-[var(--text-muted)]'
  } else if (position === 1) {
    colorClass = 'text-yellow-600 dark:text-yellow-300'
  } else if (position === 2) {
    colorClass = 'text-gray-500 dark:text-gray-300'
  } else if (position === 3) {
    colorClass = 'text-amber-700 dark:text-amber-300'
  } else {
    colorClass = 'text-[var(--text-secondary)]'
  }

  const bubbleClasses = [
    SIZE_CLASS,
    colorClass,
    'rounded-full font-bold',
    'flex items-center justify-center',
    'bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.75)]',
    'border border-white/30 dark:border-white/10',
    'backdrop-blur-sm shadow-md',
    'relative z-10 inline-block',
    isOut ? '' : 'transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer',
  ].filter(Boolean).join(' ')

  if (isOut) {
    return <div className={bubbleClasses}>OUT</div>
  }

  return (
    <Popover className="relative inline-block">
      <PopoverButton className={`${bubbleClasses} focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]`}>
        #{position}
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'top', gap: 10 }}
        transition
        className="z-50 w-60 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-strong)] shadow-2xl p-4 focus:outline-none origin-bottom transition data-[closed]:scale-95 data-[closed]:opacity-0 duration-150 ease-out"
      >
        <div className="text-xs text-[var(--text-muted)] mb-2">{formattedDate}</div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-[var(--theme-text)] tabular-nums leading-none">#{position}</span>
          <span className="text-xs text-[var(--text-muted)]">{t('position')}</span>
        </div>
        <div className="space-y-1 mb-3">
          {typeof playcount === 'number' && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t('plays')}</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{playcount.toLocaleString()}</span>
            </div>
          )}
          {typeof vibeScore === 'number' && vibeScore !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{t('vs')}</span>
              <span className="text-[var(--text-primary)] font-semibold tabular-nums">{vibeScore.toFixed(1)}</span>
            </div>
          )}
        </div>
        <Link
          href={href}
          className="block w-full text-center px-3 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-button-text)] font-semibold text-sm hover:brightness-110 transition"
        >
          {t('viewWeekCharts')}
        </Link>
      </PopoverPanel>
    </Popover>
  )
}

export default memo(PositionBubble)
