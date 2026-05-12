'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DayPicker } from 'react-day-picker'
import {
  getWeekStartForDay,
  formatWeekDate,
  formatChartWeekDate,
  getChartWeekReferenceDate,
  utcToLocalDate,
} from '@/lib/weekly-utils'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface WeekCalendarProps {
  availableWeeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
  onWeekChange?: () => void
}

export default function WeekCalendar({ availableWeeks, currentWeek, trackingDayOfWeek, onWeekChange }: WeekCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse, stopPulse } = useNavigation()
  const t = useSafeTranslations('charts')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => stopPulse(), 500)
    return () => clearTimeout(timer)
  }, [searchParams, stopPulse])

  useEffect(() => {
    if (!isOpen) {
      setCoords(null)
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (popoverRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return

    const computePosition = () => {
      if (!triggerRef.current || !popoverRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const popoverRect = popoverRef.current.getBoundingClientRect()
      const gap = 8
      const margin = 8
      const vw = window.innerWidth
      const vh = window.innerHeight

      let left = triggerRect.right + gap
      let top = triggerRect.top

      if (left + popoverRect.width > vw - margin) {
        // Not enough room beside the trigger — center on screen
        left = Math.max(margin, (vw - popoverRect.width) / 2)
        top = Math.max(margin, (vh - popoverRect.height) / 2)
      } else {
        top = Math.max(margin, Math.min(top, vh - popoverRect.height - margin))
      }

      setCoords({ top, left })
    }

    computePosition()
    window.addEventListener('resize', computePosition)
    window.addEventListener('scroll', computePosition, true)
    return () => {
      window.removeEventListener('resize', computePosition)
      window.removeEventListener('scroll', computePosition, true)
    }
  }, [isOpen])

  const availableWeekStarts = new Set(
    availableWeeks.map(week => formatWeekDate(week.weekStart))
  )

  const availableDates = new Set<string>()
  availableWeeks.forEach(week => {
    const weekStart = new Date(week.weekStart)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setUTCDate(date.getUTCDate() + i)
      availableDates.add(formatWeekDate(date))
    }
  })

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    const weekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const weekStartStr = formatWeekDate(weekStart)

    if (!availableWeekStarts.has(weekStartStr)) {
      return
    }

    onWeekChange?.()
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', formatChartWeekDate(weekStart))
    router.push(`?${params.toString()}`)
    setIsOpen(false)
  }

  const isDateAvailable = (date: Date): boolean => {
    return availableDates.has(formatWeekDate(date))
  }

  const isDateInCurrentWeek = (date: Date): boolean => {
    const dateWeekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const currentWeekStart = getWeekStartForDay(currentWeek, trackingDayOfWeek)
    return formatWeekDate(dateWeekStart) === formatWeekDate(currentWeekStart)
  }

  const disabled = (date: Date) => !isDateAvailable(date)

  return (
    <>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--theme-primary-dark)]">{t('otherDates')}</h3>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((v) => !v)}
          className="w-full px-4 py-3 rounded-lg transition-all duration-200 text-left hover:shadow-sm border border-white/30 dark:border-white/10 bg-white/40 dark:bg-[rgb(var(--surface-card-rgb)/0.4)]"
          style={{
            color: 'var(--theme-text)',
          }}
        >
          {t('openCalendar')}
        </button>
      </div>

      {mounted && isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-50 rounded-lg shadow-2xl p-4 sm:p-6 w-auto max-w-[calc(100vw-1rem)] border border-theme bg-white/[0.98] dark:bg-[rgb(var(--surface-card-rgb)/0.98)]"
          style={{
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            visibility: coords ? 'visible' : 'hidden',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[var(--theme-primary-dark)]">{t('selectDate')}</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--theme-text)] hover:text-[var(--theme-primary-dark)] text-2xl leading-none w-8 h-8 flex items-center justify-center transition-colors"
              aria-label={t('close')}
            >
              ×
            </button>
          </div>

          <DayPicker
            mode="single"
            selected={utcToLocalDate(getChartWeekReferenceDate(currentWeek))}
            onSelect={handleDateSelect}
            disabled={disabled}
            modifiers={{
              available: (date) => isDateAvailable(date),
              currentWeek: (date) => isDateInCurrentWeek(date),
            }}
            modifiersClassNames={{
              available: 'rdp-day_available',
              currentWeek: 'rdp-day_current-week',
            }}
          />
        </div>,
        document.body
      )}
    </>
  )
}

