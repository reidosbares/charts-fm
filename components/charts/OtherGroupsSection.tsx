'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import useSWR from 'swr'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import SafeImage from '@/components/SafeImage'
import { ChartType, getEntryDrillDownPath } from '@/lib/chart-slugs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

const AUTO_SCROLL_INTERVAL_MS = 7000

interface OtherGroupStats {
  peakPosition: number
  totalWeeksCharting: number
  totalVS: number
  totalPlays: number
}

interface OtherGroup {
  id: string
  name: string
  image: string | null
  stats: OtherGroupStats
}

interface OtherGroupsSectionProps {
  groupId: string
  chartType: ChartType
  slug: string
}

export default function OtherGroupsSection({
  groupId,
  chartType,
  slug,
}: OtherGroupsSectionProps) {
  const t = useSafeTranslations('deepDive.otherGroups')
  const { data, error, isLoading: loading } = useSWR<{ otherGroups: OtherGroup[] }>(
    `/api/groups/${groupId}/charts/${chartType}/${encodeURIComponent(slug)}/other-groups`
  )
  const [index, setIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const groups = data?.otherGroups ?? []
  const hasGroups = groups.length > 0
  const currentGroup = hasGroups ? groups[index] : null

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSlideDirection('right')
      setIndex((i) => (i >= groups.length - 1 ? 0 : i + 1))
    }, AUTO_SCROLL_INTERVAL_MS)
  }, [groups.length])

  const goPrev = useCallback(() => {
    setSlideDirection('left')
    setIndex((i) => (i <= 0 ? groups.length - 1 : i - 1))
    if (groups.length > 1) startAutoScroll()
  }, [groups.length, startAutoScroll])
  const goNext = useCallback(() => {
    setSlideDirection('right')
    setIndex((i) => (i >= groups.length - 1 ? 0 : i + 1))
    if (groups.length > 1) startAutoScroll()
  }, [groups.length, startAutoScroll])

  // Auto-advance carousel when multiple groups
  useEffect(() => {
    if (groups.length <= 1) return
    startAutoScroll()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [groups.length, startAutoScroll])

  if (loading) {
    return (
      <div
        className="bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)] backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-5 md:p-6 border border-white/40 dark:border-white/10"
        style={{ contain: 'layout style paint' }}
        data-testid="other-groups-section"
      >
        <div className="animate-pulse">
          <div className="h-4 sm:h-5 md:h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 sm:w-48 mb-3 sm:mb-4" />
          <div className="h-36 sm:h-44 md:h-52 bg-gray-200 dark:bg-gray-700 rounded-xl sm:rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error) return null

  return (
    <section
      className="bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)] backdrop-blur-md rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-5 md:p-6 border border-white/40 dark:border-white/10 shadow-sm"
      style={{ contain: 'layout style paint' }}
      data-testid="other-groups-section"
      aria-labelledby="other-groups-title"
    >
      <h2
        id="other-groups-title"
        className="text-base sm:text-lg md:text-xl font-bold text-[var(--text-primary)] mb-3 sm:mb-4 md:mb-5"
      >
        {t('title')}
      </h2>

      {hasGroups && currentGroup ? (
        <div className="relative py-1 sm:py-2 flex flex-col sm:flex-row items-stretch gap-3 sm:gap-3">
          {/* Card row: full width on mobile, with arrows beside on sm+ */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-3 sm:flex-1 sm:min-w-0 order-1">
            {/* Prev - only on sm+ when beside card */}
            {groups.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goPrev()
                }}
                className="hidden sm:flex flex-shrink-0 self-center w-10 h-10 rounded-full bg-white/90 dark:bg-[var(--surface-elevated)] hover:bg-white dark:hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-base)] shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
                aria-label={t('prevGroup')}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
              </button>
            )}

            {/* Card - full width on mobile so stats aren't cramped */}
            <Link
              key={currentGroup.id}
              href={getEntryDrillDownPath(currentGroup.id, chartType, slug)}
              className={`flex-1 min-w-0 flex flex-col sm:flex-row items-center gap-3 sm:gap-5 md:gap-6 p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/60 dark:border-white/10 bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)] hover:bg-white/70 dark:hover:bg-[rgb(var(--surface-card-rgb)/0.7)] active:bg-white/70 dark:active:bg-[rgb(var(--surface-card-rgb)/0.7)] shadow-md hover:shadow-lg transition-shadow duration-300 touch-manipulation min-h-0 ${
                slideDirection === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left'
              }`}
            >
              <div className="relative flex-shrink-0 w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl sm:rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-[var(--surface-base)] shadow-sm">
                {currentGroup.image ? (
                  <SafeImage
                    src={currentGroup.image}
                    alt=""
                    className="object-cover w-full h-full"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 128px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-2xl sm:text-4xl font-bold">
                    {currentGroup.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--text-primary)] break-words" title={currentGroup.name}>
                  {currentGroup.name}
                </p>
                {/* Mobile: single column so full labels + values visible. sm+: 2 columns */}
                <div className="mt-2 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-3 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm md:text-base text-[var(--text-secondary)]">
                  <span>{t('peakPosition')}: <strong className="text-[var(--text-primary)]">#{currentGroup.stats.peakPosition}</strong></span>
                  <span>{t('totalWeeksCharting')}: <strong className="text-[var(--text-primary)]">{currentGroup.stats.totalWeeksCharting} {t('weeksUnit')}</strong></span>
                  <span>{t('totalVS')}: <strong className="text-[var(--text-primary)]">{currentGroup.stats.totalVS.toFixed(2)} {t('vsUnit')}</strong></span>
                  <span>{t('totalPlays')}: <strong className="text-[var(--text-primary)]">{currentGroup.stats.totalPlays.toLocaleString()} {t('playsUnit')}</strong></span>
                </div>
              </div>
            </Link>

            {/* Next - only on sm+ when beside card */}
            {groups.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goNext()
                }}
                className="hidden sm:flex flex-shrink-0 self-center w-10 h-10 rounded-full bg-white/90 dark:bg-[var(--surface-elevated)] hover:bg-white dark:hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-base)] shadow-md border border-[var(--border-subtle)] items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
                aria-label={t('nextGroup')}
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            )}
          </div>

          {/* Mobile only: arrows below card */}
          {groups.length > 1 && (
            <div className="flex sm:hidden justify-center gap-6 order-2 pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goPrev()
                }}
                className="min-w-11 min-h-11 w-11 h-11 rounded-full bg-white/90 dark:bg-[var(--surface-elevated)] hover:bg-white dark:hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-base)] shadow-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all touch-manipulation active:scale-95"
                aria-label={t('prevGroup')}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  goNext()
                }}
                className="min-w-11 min-h-11 w-11 h-11 rounded-full bg-white/90 dark:bg-[var(--surface-elevated)] hover:bg-white dark:hover:bg-[var(--surface-elevated)] active:bg-[var(--surface-base)] shadow-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all touch-manipulation active:scale-95"
                aria-label={t('nextGroup')}
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm md:text-base italic py-1 sm:py-2">
          {t('emptyMessage')}
        </p>
      )}
    </section>
  )
}
