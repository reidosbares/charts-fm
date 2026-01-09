'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import ChartGenerationErrorModal from '@/components/ChartGenerationErrorModal'

interface RegenerateChartsTabProps {
  groupId: string
  isSuperuser?: boolean
  initialInProgress?: boolean
}

export default function RegenerateChartsTab({ 
  groupId, 
  isSuperuser = false, 
  initialInProgress = false 
}: RegenerateChartsTabProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.regenerateCharts')
  const tMessages = useSafeTranslations('groups.settings.regenerateCharts.loadingMessages')
  
  const LOADING_MESSAGES = useMemo(() => [
    tMessages('interestingTastes'),
    tMessages('unexpectedArtist'),
    tMessages('oldTrack'),
    tMessages('calculatingPositions'),
    tMessages('deepCuts'),
    tMessages('albumLove'),
    tMessages('uniqueHabits'),
    tMessages('processingScrobbles'),
    tMessages('hiddenGems'),
  ], [tMessages])
  
  const [isLoading, setIsLoading] = useState(initialInProgress)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [showFirstMessage, setShowFirstMessage] = useState(true)
  const [weeks, setWeeks] = useState<number>(5)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [failedUsers, setFailedUsers] = useState<string[]>([])
  const [aborted, setAborted] = useState(false)
  const [progress, setProgress] = useState<{ currentWeek: number; totalWeeks: number; stage: string } | null>(null)

  // Poll for completion and progress if initially in progress or currently loading
  useEffect(() => {
    if (!isLoading) {
      setProgress(null)
      return
    }

    const pollInterval = 2500 // 2.5 seconds
    let isPolling = true

    const poll = async () => {
      if (!isPolling) return

      try {
        const response = await fetch(`/api/groups/${groupId}/charts/update`)
        if (!response.ok) {
          throw new Error('Failed to check generation status')
        }

        const data = await response.json()

        // Update progress if available
        if (data.progress) {
          setProgress(data.progress)
        }

        if (!data.inProgress) {
          // Generation complete
          setIsLoading(false)
          setProgress(null)
          setSuccess(true)
          // Refresh after showing success message
          setTimeout(() => {
            router.refresh()
          }, 2000)
        } else if (isPolling) {
          // Still in progress, poll again
          setTimeout(poll, pollInterval)
        }
      } catch (err) {
        console.error('Error polling for completion:', err)
        // Continue polling even on error (might be temporary)
        if (isPolling) {
          setTimeout(poll, pollInterval)
        }
      }
    }

    // Start polling after a short delay to allow synchronous completion to be handled first
    const timeoutId = setTimeout(poll, 1000)

    // Cleanup function to stop polling
    return () => {
      isPolling = false
      clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, groupId])

  useEffect(() => {
    if (!isLoading) {
      setShowFirstMessage(true)
      setCurrentMessageIndex(0)
      return
    }

    // Show first message for 5 seconds, then start rotating
    const firstMessageTimer = setTimeout(() => {
      setShowFirstMessage(false)
    }, 5000)

    // Rotate messages every 10 seconds (starting after first message) with random selection
    const rotationTimer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        // Pick a random index, but avoid showing the same message twice in a row
        let newIndex
        do {
          newIndex = Math.floor(Math.random() * LOADING_MESSAGES.length)
        } while (newIndex === prev && LOADING_MESSAGES.length > 1)
        return newIndex
      })
    }, 10000)

    return () => {
      clearTimeout(firstMessageTimer)
      clearInterval(rotationTimer)
    }
  }, [isLoading])

  const handleGenerate = async () => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    setShowFirstMessage(true)
    setCurrentMessageIndex(0)
    setProgress(null)

    try {
      const body: { weeks?: number } = {}
      if (isSuperuser) {
        body.weeks = weeks
      }

      const response = await fetch(`/api/groups/${groupId}/charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      let data: any = {}
      try {
        data = await response.json()
      } catch (jsonError) {
        // If JSON parsing fails, try to get text
        const text = await response.text()
        throw new Error(text || 'Failed to parse response')
      }

      // Check for failed users info in both success and error responses (check this FIRST)
      if (data.failedUsers && Array.isArray(data.failedUsers) && data.failedUsers.length > 0) {
        setFailedUsers(data.failedUsers)
        setAborted(data.aborted || false)
        setShowErrorModal(true)
        setIsLoading(false)
        setProgress(null)
        // If it was a success response with warnings, also set success
        if (response.ok) {
          setSuccess(true)
        }
        return
      }

      if (!response.ok) {
        throw new Error(data.error || t('failedToGenerate'))
      }

      // Check if generation completed synchronously (POST route processes everything before returning)
      // If weeklyStats is in the response, generation is complete
      if (data.weeklyStats) {
        // Generation completed synchronously - show success message briefly before refreshing
        setSuccess(true)
        setIsLoading(false)
        setProgress(null)
        // Refresh the page to show updated charts after showing success message
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        // Generation is happening in background, start polling for progress
        // Keep isLoading true - polling effect will handle completion
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToGenerate'))
      setIsLoading(false)
      setProgress(null)
    }
  }

  const getStatusMessage = () => {
    if (progress) {
      const { currentWeek, totalWeeks, stage } = progress
      const percentage = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0
      
      if (stage === 'initializing') {
        return t('fetchingData')
      } else if (stage === 'fetching') {
        return t('fetchingData')
      } else if (stage === 'processing') {
        return t('processingWeek', { current: currentWeek, total: totalWeeks, percentage })
      } else if (stage === 'finalizing') {
        return t('finalizing')
      }
    }
    
    if (showFirstMessage) {
      return t('fetchingData')
    }
    return t('fetchingData')
  }

  const getFunnyMessage = () => {
    // Show funny messages when:
    // 1. We have progress and we're processing or finalizing (show immediately)
    // 2. OR we're past the first message period (after 5 seconds)
    if (progress && (progress.stage === 'processing' || progress.stage === 'finalizing')) {
      return LOADING_MESSAGES[currentMessageIndex]
    }
    
    // Show after first message period even if no progress yet
    if (!showFirstMessage) {
      return LOADING_MESSAGES[currentMessageIndex]
    }
    
    return null
  }

  const getProgressPercentage = () => {
    if (!progress || progress.totalWeeks === 0) return 0
    return Math.min(100, Math.round((progress.currentWeek / progress.totalWeeks) * 100))
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{t('title')}</h2>
      
      {isLoading && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg text-sm md:text-base">
          <div className="flex items-center gap-2 md:gap-3 mb-3">
            <svg
              className="animate-spin h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="font-medium">{getStatusMessage()}</span>
          </div>
          
          {progress && progress.totalWeeks > 0 && (
            <div className="mt-3">
              <div className="flex justify-between items-center mb-1.5 text-xs text-blue-600">
                <span>
                  {progress.stage === 'processing' 
                    ? `Week ${progress.currentWeek} of ${progress.totalWeeks}`
                    : progress.stage === 'finalizing'
                    ? 'Finalizing...'
                    : 'Initializing...'}
                </span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
          )}

          {getFunnyMessage() && (
            <div className={`text-center ${progress && progress.totalWeeks > 0 ? 'mt-4' : 'mt-3'}`}>
              <p className="font-serif text-sm md:text-base italic text-blue-600">
                {getFunnyMessage()}
              </p>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm md:text-base">
          {t('generatedSuccessfully')}
        </div>
      )}

      {error && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm md:text-base">
          {error}
        </div>
      )}

      <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
        {t('description', { weeks: isSuperuser ? weeks : 10 })}
      </p>

      {isSuperuser && (
        <div className="mb-4 md:mb-6">
          <label htmlFor="weeks" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('weeksToGenerate')}
          </label>
          <input
            id="weeks"
            type="number"
            min="1"
            max="52"
            value={weeks}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0 && value <= 52) {
                setWeeks(value)
              }
            }}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('weeksToGenerateDescription')}
          </p>
        </div>
      )}

      {isLoading && !success && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm md:text-base">
          {t('alreadyInProgress')}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-1">
            {t('generating')}
            <span className="inline-flex">
              <span className="animate-dots">.</span>
              <span className="animate-dots-delay-1">.</span>
              <span className="animate-dots-delay-2">.</span>
            </span>
          </span>
        ) : (
          t('generateCharts')
        )}
      </button>

      <ChartGenerationErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false)
          if (success) {
            router.refresh()
          }
        }}
        failedUsers={failedUsers}
        aborted={aborted}
      />
    </div>
  )
}

