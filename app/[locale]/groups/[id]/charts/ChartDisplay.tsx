'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import ChartTypeSelector from './ChartTypeSelector'
import ChartTable from './ChartTable'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { formatChartWeekDate } from '@/lib/weekly-utils'
import { useNavigation } from '@/contexts/NavigationContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartDisplayProps {
  initialType: ChartType
  artists: EnrichedChartItem[]
  tracks: EnrichedChartItem[]
  albums: EnrichedChartItem[]
  isLoading?: boolean
  onLoadingChange?: (loading: boolean) => void
  onTypeChange?: (type: ChartType) => void
  groupId: string
  weeks: { weekStart: Date }[]
  currentWeek: Date
  onWeekNavigate?: () => void
}

function toWeekStartTime(value: Date | string): number {
  const d = value instanceof Date ? value : new Date(value)
  return d.getTime()
}

export default function ChartDisplay({
  initialType,
  artists,
  tracks,
  albums,
  isLoading = false,
  onLoadingChange,
  onTypeChange,
  groupId,
  weeks,
  currentWeek,
  onWeekNavigate,
}: ChartDisplayProps) {
  const [currentType, setCurrentType] = useState<ChartType>(initialType)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { triggerPulse } = useNavigation()
  const isInternalChange = useRef(false)
  const previousItemsRef = useRef<EnrichedChartItem[] | null>(null)
  const t = useSafeTranslations('charts')

  const currentWeekKey = formatChartWeekDate(new Date(toWeekStartTime(currentWeek)))
  const currentWeekIndex = useMemo(
    () => weeks.findIndex((w) => formatChartWeekDate(new Date(w.weekStart)) === currentWeekKey),
    [weeks, currentWeekKey]
  )
  const weekOrdinal =
    currentWeekIndex >= 0 && weeks.length > 0 ? weeks.length - currentWeekIndex : null
  const canGoPrevious = currentWeekIndex >= 0 && currentWeekIndex < weeks.length - 1
  const canGoNext = currentWeekIndex > 0

  const navigateToWeek = (weekStart: Date) => {
    onWeekNavigate?.()
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', formatChartWeekDate(weekStart))
    router.push(`?${params.toString()}`)
  }

  const currentItems = useMemo(() => {
    switch (currentType) {
      case 'artists':
        return artists
      case 'tracks':
        return tracks
      case 'albums':
        return albums
    }
  }, [currentType, artists, tracks, albums])

  // Clear loading when table items change (new data rendered)
  useEffect(() => {
    if (isLoading && previousItemsRef.current && currentItems !== previousItemsRef.current) {
      previousItemsRef.current = currentItems
      const timer = setTimeout(() => onLoadingChange?.(false), 150)
      return () => clearTimeout(timer)
    } else if (!previousItemsRef.current && currentItems.length > 0) {
      previousItemsRef.current = currentItems
    }
  }, [currentItems, isLoading, onLoadingChange])

  // Sync chart type with URL (e.g., back button navigation)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }

    const urlType = searchParams.get('type') as ChartType | null
    if (urlType && ['artists', 'tracks', 'albums'].includes(urlType) && urlType !== currentType) {
      setCurrentType(urlType)
    }
  }, [searchParams, currentType])

  const handleTypeChange = (type: ChartType) => {
    setCurrentType(type)
    onTypeChange?.(type)
    isInternalChange.current = true
    requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      params.set('type', type)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      {weeks.length > 0 && weekOrdinal !== null && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <LiquidGlassButton
            type="button"
            variant="primary"
            useTheme
            size="md"
            className="shrink-0 min-w-[4.75rem] sm:min-w-20 !aspect-auto px-6"
            disabled={!canGoPrevious}
            aria-label={t('previousChartWeek')}
            icon={<FontAwesomeIcon icon={faChevronLeft} className="text-sm" aria-hidden />}
            onClick={() => canGoPrevious && navigateToWeek(new Date(weeks[currentWeekIndex + 1].weekStart))}
          />
          <p className="text-center text-base sm:text-lg font-semibold text-[var(--theme-primary-dark)] tabular-nums px-2">
            {t('weekNumber', { number: weekOrdinal })}
          </p>
          <LiquidGlassButton
            type="button"
            variant="primary"
            useTheme
            size="md"
            className="shrink-0 min-w-[4.75rem] sm:min-w-20 !aspect-auto px-6"
            disabled={!canGoNext}
            aria-label={t('nextChartWeek')}
            icon={<FontAwesomeIcon icon={faChevronRight} className="text-sm" aria-hidden />}
            onClick={() => canGoNext && navigateToWeek(new Date(weeks[currentWeekIndex - 1].weekStart))}
          />
        </div>
      )}
      <div className="mb-4">
        <ChartTypeSelector currentType={currentType} onTypeChange={handleTypeChange} />
      </div>
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
        <ChartTable items={currentItems} chartType={currentType} groupId={groupId} />
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[var(--surface-card)] backdrop-blur-sm rounded-lg z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[var(--theme-primary-lighter)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
            <p className="text-sm text-[var(--text-secondary)] font-medium">{t('loadingChartData')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

