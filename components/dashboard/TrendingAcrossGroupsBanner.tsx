'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  const [items, setItems] = useState<TrendingBannerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [index, setIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetch('/api/dashboard/trending-across-groups')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : [])
          setIndex(0)
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
        className="w-full bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-200/80 mb-8"
        aria-hidden
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 xl:px-24 py-8 md:py-10">
          <div className="animate-pulse w-full aspect-[2.5/1] max-h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !hasItems) {
    return null
  }

  return (
    <section
      className="w-full bg-gradient-to-b from-gray-50 to-white border-b border-gray-200/80 mb-8"
      aria-labelledby="trending-banner-title"
    >
      <h2
        id="trending-banner-title"
        className="sr-only"
      >
        {t('title')}
      </h2>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 xl:px-24 py-6 md:py-8">
        <div className="relative flex flex-col md:flex-row items-stretch gap-5 md:gap-8">
          {/* Prev - desktop */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              className="hidden md:flex flex-shrink-0 self-center w-11 h-11 rounded-full bg-white/95 hover:bg-white active:bg-gray-50 shadow-lg border border-gray-200/80 items-center justify-center text-gray-600 hover:text-gray-900 transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
              aria-label={t('prev')}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
            </button>
          )}

          {/* Slide content - key forces remount so animation runs on every slide change (manual and auto) */}
          {currentItem && (
            <div
              key={index}
              className={`flex-1 min-w-0 flex flex-col md:flex-row gap-5 md:gap-8 ${
                slideDirection === 'right' ? 'animate-slide-in-from-right' : 'animate-slide-in-from-left'
              }`}
            >
              {/* Image - larger on desktop */}
              <div className="relative w-full md:w-72 lg:w-80 flex-shrink-0 aspect-square md:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200/60 shadow-md">
                {currentItem.imageUrl ? (
                  <SafeImage
                    src={currentItem.imageUrl}
                    alt=""
                    className="object-cover w-full h-full"
                    fill
                    sizes="(max-width: 768px) 100vw, 320px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
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
                  <span className="line-clamp-2">{currentItem.name}</span>
                  {currentItem.artist && (
                    <span className="text-gray-600 font-normal block mt-0.5 md:mt-1 text-lg md:text-xl lg:text-2xl">
                      {currentItem.artist}
                    </span>
                  )}
                </p>
                <p className="text-sm md:text-base text-gray-600 mt-2 md:mt-3">
                  {currentItem.forYou && currentItem.subtitleKey
                    ? t(currentItem.subtitleKey as 'yourTopArtist' | 'yourTopTrack')
                    : t('chartingInGroups', { count: currentItem.groupCount })}
                </p>
                {currentItem.groups.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:gap-3 mt-4 md:mt-5">
                    {currentItem.groups.map((group) => (
                      <Link
                        key={group.id}
                        href={getEntryDrillDownPath(group.id, currentItem.chartType, currentItem.slug)}
                        className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/90 hover:bg-white border border-gray-200/80 shadow-sm hover:shadow-md transition-all touch-manipulation min-h-[48px]"
                      >
                        <span className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 block">
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

          {/* Next - desktop */}
          {items.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              className="hidden md:flex flex-shrink-0 self-center w-11 h-11 rounded-full bg-white/95 hover:bg-white active:bg-gray-50 shadow-lg border border-gray-200/80 items-center justify-center text-gray-600 hover:text-gray-900 transition-all touch-manipulation z-10 hover:scale-105 active:scale-95"
              aria-label={t('next')}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
            </button>
          )}
        </div>

        {/* Dots + mobile arrows */}
        {items.length > 1 && (
          <div className="flex justify-center items-center gap-3 md:gap-4 mt-5 md:mt-6 pt-4 border-t border-gray-200/60">
            <button
              type="button"
              onClick={goPrev}
              className="md:hidden min-w-11 min-h-11 w-11 h-11 rounded-full bg-white/95 hover:bg-white active:bg-gray-50 shadow-md border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all touch-manipulation"
              aria-label={t('prev')}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label={t('slideIndicator')}>
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
                  className={`w-2.5 h-2.5 rounded-full transition-all touch-manipulation ${
                    i === index
                      ? 'bg-gray-800 scale-125'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              className="md:hidden min-w-11 min-h-11 w-11 h-11 rounded-full bg-white/95 hover:bg-white active:bg-gray-50 shadow-md border border-gray-200/80 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all touch-manipulation"
              aria-label={t('next')}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
