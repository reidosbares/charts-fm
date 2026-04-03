'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import useSWR from 'swr'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import SafeImage from '@/components/SafeImage'
import { getEntryDrillDownPath } from '@/lib/chart-slugs'
import type { ChartType } from '@/lib/chart-slugs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight, faMusic } from '@fortawesome/free-solid-svg-icons'

const AUTO_SCROLL_INTERVAL_MS = 6500

interface TrendingBannerGroup {
  id: string
  name: string
  image: string | null
}

interface TrendingBannerItem {
  chartType: ChartType
  entryKey: string
  name: string
  artist: string | null
  slug: string
  imageUrl: string | null
  groupCount: number
  groups: TrendingBannerGroup[]
  forYou?: boolean
  subtitleKey?: string
}

export default function TrendingAcrossGroupsBanner() {
  const t = useSafeTranslations('dashboard.trendingBanner')
  const { data, error, isLoading: loading } = useSWR<{ items: TrendingBannerItem[] }>('/api/dashboard/trending-across-groups')
  const items = data?.items ?? []
  const [index, setIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const slideAreaRef = useRef<HTMLDivElement>(null)
  const [contentMinHeight, setContentMinHeight] = useState(0)

  const hasItems = items.length > 0
  const currentItem = hasItems ? items[index] : null

  const startAutoScroll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setSlideDirection('right')
      setIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
    }, AUTO_SCROLL_INTERVAL_MS)
  }, [items.length])

  const goPrev = useCallback(() => {
    setSlideDirection('left')
    setIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
    if (items.length > 1) startAutoScroll()
  }, [items.length, startAutoScroll])

  const goNext = useCallback(() => {
    setSlideDirection('right')
    setIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
    if (items.length > 1) startAutoScroll()
  }, [items.length, startAutoScroll])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    const SWIPE_THRESHOLD = 50
    if (delta < -SWIPE_THRESHOLD) {
      goNext()
    } else if (delta > SWIPE_THRESHOLD) {
      goPrev()
    }
    touchStartX.current = null
  }, [goNext, goPrev])

  // Measure slide height after each render and lock to the tallest observed
  useEffect(() => {
    if (slideAreaRef.current) {
      const h = slideAreaRef.current.scrollHeight
      setContentMinHeight((prev) => Math.max(prev, h))
    }
  }, [index])

  // Reset locked height on resize since layout changes between breakpoints
  useEffect(() => {
    const onResize = () => setContentMinHeight(0)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (items.length <= 1) return
    startAutoScroll()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [items.length, startAutoScroll])

  if (loading) {
    return (
      <div
        className="w-full bg-gradient-to-b from-amber-50/40 to-transparent mb-8"
        aria-hidden
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 xl:px-24 py-8 md:py-10">
          <div className="animate-pulse w-full aspect-[2.5/1] max-h-64 bg-amber-100/50 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !hasItems) {
    return null
  }

  return (
    <section
      className="w-full bg-gradient-to-b from-amber-50/40 to-transparent mb-8"
      aria-labelledby="trending-banner-title"
    >
      <h2
        id="trending-banner-title"
        className="sr-only"
      >
        {t('title')}
      </h2>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 xl:px-24 py-4 md:py-8">
        <div
          className="relative flex flex-col md:flex-row items-stretch gap-3 md:gap-8"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Prev - desktop */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="hidden md:flex flex-shrink-0 self-center w-11 h-11 rounded-full bg-white/90 hover:bg-white active:bg-amber-50 shadow-md border border-gray-200/60 items-center justify-center text-gray-400 hover:text-amber-600 transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
              aria-label={t('prev')}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
            </button>
          )}

          {/* Stable wrapper: stays mounted across slides, locks to max observed height */}
          <div
            ref={slideAreaRef}
            className="flex-1 min-w-0"
            style={contentMinHeight ? { minHeight: contentMinHeight } : undefined}
          >
            {/* Slide content - key forces remount so animation runs on every slide change (manual and auto) */}
            {currentItem && (
              <div
                key={index}
                className={`flex flex-col md:flex-row gap-3 md:gap-8 ${
                  slideDirection === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left'
                }`}
              >
                {/* Image - larger on desktop */}
                <div className="relative w-full md:w-72 lg:w-80 flex-shrink-0 aspect-[16/9] md:aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden bg-amber-50 shadow-lg shadow-amber-900/10">
                  {currentItem.imageUrl ? (
                    <SafeImage
                      src={currentItem.imageUrl}
                      alt=""
                      className="object-cover w-full h-full"
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/80">
                      <FontAwesomeIcon icon={faMusic} className="text-5xl md:text-6xl opacity-60" />
                    </div>
                  )}
                  {currentItem.forYou && (
                    <span
                      className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400/95 text-amber-950 shadow-sm"
                      aria-hidden
                    >
                      {t('forYouBadge')}
                    </span>
                  )}
                </div>

                {/* Text + pills */}
                <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                  <p
                    className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight"
                    title={currentItem.artist ? `${currentItem.name} — ${currentItem.artist}` : currentItem.name}
                  >
                    <span className="block truncate">{currentItem.name}</span>
                    {currentItem.artist && (
                      <span className="text-gray-600 font-normal block truncate mt-0.5 md:mt-1 text-base md:text-xl lg:text-2xl">
                        {currentItem.artist}
                      </span>
                    )}
                  </p>
                  <p className="text-xs md:text-base text-gray-600 mt-1 md:mt-3">
                    {currentItem.forYou && currentItem.subtitleKey
                      ? t(currentItem.subtitleKey as 'yourTopArtist' | 'yourTopTrack')
                      : t('chartingInGroups', { count: currentItem.groupCount })}
                  </p>
                  {currentItem.groups.length > 0 && (
                    <div className="flex gap-2 md:gap-3 mt-3 md:mt-5 overflow-x-auto md:flex-wrap md:overflow-visible pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                      {currentItem.groups.map((group) => (
                        <Link
                          key={group.id}
                          href={getEntryDrillDownPath(group.id, currentItem.chartType, currentItem.slug)}
                          className="inline-flex items-center gap-2 md:gap-2.5 px-3 md:px-3.5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-white/80 hover:bg-white border border-gray-200/60 shadow-sm hover:shadow-md hover:border-amber-200 transition-all touch-manipulation min-h-[44px] md:min-h-[48px] flex-shrink-0"
                        >
                          <span className="relative w-7 h-7 md:w-9 md:h-9 rounded-md md:rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 block">
                            {group.image ? (
                              <SafeImage
                                src={group.image}
                                alt=""
                                className="object-cover w-full h-full"
                                fill
                                sizes="36px"
                              />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm font-bold">
                                {group.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate max-w-[140px] md:max-w-[180px]" title={group.name}>
                            {group.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Next - desktop */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="hidden md:flex flex-shrink-0 self-center w-11 h-11 rounded-full bg-white/90 hover:bg-white active:bg-amber-50 shadow-md border border-gray-200/60 items-center justify-center text-gray-400 hover:text-amber-600 transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
              aria-label={t('next')}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
            </button>
          )}
        </div>

        {/* Dots */}
        {items.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-3 md:mt-6">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={t('slideTo', { index: i + 1, total: items.length })}
                onClick={() => {
                  setSlideDirection(i > index ? 'right' : 'left')
                  setIndex(i)
                  startAutoScroll()
                }}
                className={`rounded-full transition-all touch-manipulation ${
                  i === index
                    ? 'w-2.5 h-2.5 bg-amber-500'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
