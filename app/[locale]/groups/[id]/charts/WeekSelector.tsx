'use client'

import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { formatChartWeekDate, formatChartWeekLabel } from '@/lib/weekly-utils'
import { useNavigation } from '@/contexts/NavigationContext'
import WeekCalendar from './WeekCalendar'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface WeekSelectorProps {
  weeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
  onWeekChange?: () => void
}

export default function WeekSelector({ weeks, currentWeek, trackingDayOfWeek, onWeekChange }: WeekSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse } = useNavigation()
  const t = useSafeTranslations('charts')

  const handleWeekChange = (weekStart: Date) => {
    onWeekChange?.()
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', formatChartWeekDate(weekStart))
    router.push(`?${params.toString()}`)
  }

  const defaultWeeks = weeks.slice(0, 5)
  const currentWeekTime = currentWeek.getTime()
  const isCurrentInDefault = defaultWeeks.some(
    (week) => week.weekStart.getTime() === currentWeekTime
  )
  const currentWeekEntry = isCurrentInDefault
    ? null
    : weeks.find((week) => week.weekStart.getTime() === currentWeekTime)
  const displayedWeeks = currentWeekEntry
    ? [...defaultWeeks, currentWeekEntry]
    : defaultWeeks

  return (
    <div
      className="rounded-lg shadow-lg p-4 overflow-hidden bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)] border border-white/30 dark:border-white/10"
      style={{
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <h3 className="text-lg font-semibold mb-4 text-[var(--theme-primary-dark)]">{t('selectWeek')}</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedWeeks.map((week) => {
          const isSelected = week.weekStart.getTime() === currentWeek.getTime()
          return (
            <button
              key={week.weekStart.toISOString()}
              onClick={() => handleWeekChange(week.weekStart)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border border-white/30 dark:border-white/10 ${isSelected ? 'font-semibold shadow-lg' : 'hover:shadow-md bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)]'}`}
              style={{
                background: isSelected ? 'var(--theme-primary)' : undefined,
                color: isSelected ? 'var(--theme-button-text)' : 'var(--theme-text)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                boxShadow: isSelected
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.filter = 'brightness(1.1)'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.filter = ''
                  e.currentTarget.style.transform = ''
                }
              }}
            >
              {formatChartWeekLabel(week.weekStart)}
            </button>
          )
        })}
      </div>
      <WeekCalendar 
        availableWeeks={weeks} 
        currentWeek={currentWeek}
        trackingDayOfWeek={trackingDayOfWeek}
        onWeekChange={onWeekChange}
      />
    </div>
  )
}

