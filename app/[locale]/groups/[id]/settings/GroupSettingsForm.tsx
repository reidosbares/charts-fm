'use client'

import { useState, useMemo } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import CustomSelect, { SelectOption } from '@/components/CustomSelect'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useTranslations } from 'next-intl'
import Toast from '@/components/Toast'

interface GroupSettingsFormProps {
  groupId: string
  initialChartSize: number
  initialChartMode: string
  initialTrackingDayOfWeek: number
}

const CHART_SIZES = [10, 20, 50]

export default function GroupSettingsForm({
  groupId,
  initialChartSize,
  initialChartMode,
  initialTrackingDayOfWeek,
}: GroupSettingsFormProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.chartCreation')
  const tRich = useTranslations('groups.settings.chartCreation')
  const tDays = useSafeTranslations('groups.settings.chartCreation.daysOfWeek')
  const tModes = useSafeTranslations('groups.settings.chartCreation.modes')
  const tCommon = useSafeTranslations('common')
  
  const DAYS_OF_WEEK = useMemo(() => [
    { value: 0, label: tDays('sunday') },
    { value: 5, label: tDays('friday') },
  ], [tDays])

  const CHART_MODES = useMemo(() => [
    {
      value: 'vs',
      label: tModes('vs.label'),
      icon: '/icons/icon_vs.png',
      description: tModes('vs.description'),
    },
    {
      value: 'vs_weighted',
      label: tModes('vsWeighted.label'),
      icon: '/icons/icon_vs_weighted.png',
      description: tModes('vsWeighted.description'),
    },
    {
      value: 'plays_only',
      label: tModes('playsOnly.label'),
      icon: '/icons/icon_plays.png',
      description: tModes('playsOnly.description'),
    },
  ], [tModes])

  const [chartSize, setChartSize] = useState(initialChartSize)
  const [chartMode, setChartMode] = useState(initialChartMode)
  const [trackingDayOfWeek, setTrackingDayOfWeek] = useState(initialTrackingDayOfWeek)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Find initial carousel index
  const initialIndex = CHART_MODES.findIndex(mode => mode.value === initialChartMode)
  const [carouselIndex, setCarouselIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

  const hasChanges =
    chartSize !== initialChartSize ||
    chartMode !== initialChartMode ||
    trackingDayOfWeek !== initialTrackingDayOfWeek

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartSize,
          chartMode,
          trackingDayOfWeek,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToUpdate'))
      }

      setSuccess(true)
      
      // Refresh the router cache to ensure fresh data
      router.refresh()
      
      // Redirect immediately
      router.push(`/groups/${groupId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Toast notifications */}
      <Toast
        message={t('settingsUpdated')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
      <Toast
        message={error || ''}
        type="error"
        isVisible={!!error}
        onClose={() => setError(null)}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div>
          <label htmlFor="chartSize" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
            {t('chartSize')}
          </label>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            {t('chartSizeDescription')}
          </p>
          <div className="flex flex-wrap gap-2 md:gap-4">
            {CHART_SIZES.map((size) => (
              <label
                key={size}
                className={`flex items-center px-3 md:px-4 py-2 text-sm md:text-base border-2 rounded-lg cursor-pointer transition-colors ${
                  chartSize === size
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="chartSize"
                  value={size}
                  checked={chartSize === size}
                  onChange={(e) => setChartSize(Number(e.target.value))}
                  className="sr-only"
                />
                <span className="font-medium">{t('top', { size })}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="chartMode" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
            {t('chartMode')}
          </label>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            {t('chartModeDescription')}
          </p>
          
          {/* Carousel Selector */}
          <div className="relative">
            <div className="flex items-center justify-center gap-2 md:gap-4">
              {/* Previous Button */}
              <button
                type="button"
                onClick={() => {
                  const newIndex = carouselIndex === 0 ? CHART_MODES.length - 1 : carouselIndex - 1
                  setCarouselIndex(newIndex)
                  setChartMode(CHART_MODES[newIndex].value)
                }}
                className="p-2 md:p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={t('previousMode')}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Carousel Card */}
              <div className="flex-1 max-w-md w-full">
                <div className="relative bg-white border-2 border-yellow-500 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg min-h-[380px] md:min-h-[400px] lg:min-h-[420px] flex flex-col">
                  <div className="flex flex-col items-center flex-1">
                    {/* Icon */}
                    <div className="mb-3 md:mb-4 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 flex items-center justify-center bg-white rounded-xl p-2 flex-shrink-0">
                      <img
                        src={CHART_MODES[carouselIndex].icon}
                        alt={CHART_MODES[carouselIndex].label}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    {/* Title (outside bubble) */}
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 flex-shrink-0 text-center w-full px-2">
                      {CHART_MODES[carouselIndex].label}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-xs md:text-sm text-gray-600 text-left break-words w-full px-2 md:px-3">
                      {CHART_MODES[carouselIndex].description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={() => {
                  const newIndex = carouselIndex === CHART_MODES.length - 1 ? 0 : carouselIndex + 1
                  setCarouselIndex(newIndex)
                  setChartMode(CHART_MODES[newIndex].value)
                }}
                className="p-2 md:p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={t('nextMode')}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-3 md:mt-4">
              {CHART_MODES.map((mode, index) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => {
                    setCarouselIndex(index)
                    setChartMode(mode.value)
                  }}
                  className={`h-2 rounded-full transition-all min-w-[8px] min-h-[8px] ${
                    carouselIndex === index
                      ? 'bg-yellow-500 w-8'
                      : 'bg-gray-300 hover:bg-gray-400 w-2'
                  }`}
                  aria-label={t('selectMode', { mode: mode.label })}
                />
              ))}
            </div>

            {/* Hidden radio input for form submission */}
            <input
              type="radio"
              name="chartMode"
              value={chartMode}
              checked={true}
              readOnly
              className="sr-only"
            />
          </div>
          
          {/* FAQ Link */}
          <p className="text-xs md:text-sm text-gray-500 mt-3 md:mt-4">
            {tRich.rich('chartModeFAQLink', {
              link: (chunks) => (
                <Link
                  href="/faq#what-is-the-vibe-score-vs"
                  className="text-[var(--theme-primary)] hover:underline transition-colors duration-200"
                >
                  {chunks}
                </Link>
              )
            })}
          </p>
        </div>

        <div>
          <label htmlFor="trackingDayOfWeek" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
            {t('trackingDayOfWeek')}
          </label>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
            {t('trackingDayOfWeekDescription')}
          </p>
          <CustomSelect
            id="trackingDayOfWeek"
            options={DAYS_OF_WEEK.map(day => ({ value: day.value, label: day.label }))}
            value={trackingDayOfWeek}
            onChange={(value) => setTrackingDayOfWeek(Number(value))}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-3 md:pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('saving') : t('saveSettings')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

