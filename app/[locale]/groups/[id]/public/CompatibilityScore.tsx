'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHeart, faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import Tooltip from '@/components/Tooltip'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface CompatibilityScoreProps {
  groupId: string
}

interface CompatibilityData {
  score: number
  components: {
    artistOverlap: number
    trackOverlap: number
    genreOverlap: number
    patternScore: number
  }
}

export default function CompatibilityScore({ groupId }: CompatibilityScoreProps) {
  const t = useSafeTranslations('groups.public')
  const { data: checkData, error: checkError, isLoading: isChecking, mutate } = useSWR<any>(`/api/groups/${groupId}/compatibility`)

  const score: CompatibilityData | null = checkData?.exists && checkData?.score !== undefined
    ? { score: checkData.score, components: checkData.components }
    : null
  const error = checkError || (checkData?.error ? checkData.error : null)

  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCalculate = async () => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/compatibility`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToCalculateCompatibility'))
      }

      // Refresh SWR cache with the new score
      mutate()
    } catch (err) {
      console.error('Error calculating compatibility score:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePosition = useCallback(() => {
    if (buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }, [])

  useEffect(() => {
    if (showDetails) {
      updatePosition()
      
      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [showDetails, updatePosition])

  if (isChecking) {
    return null // Don't show anything while checking
  }

  if (error) {
    return null // Don't show anything if there's an error
  }

  // If no score exists, show button to calculate
  // TEMPORARY: Recommendations system hidden for launch - button is faint and disabled
  if (!score) {
    return (
      <Tooltip 
        content={t('comingSoon')}
        position="top"
      >
        <LiquidGlassButton
          ref={buttonRef}
          onClick={(e) => {
            // TEMPORARY: Prevent click - recommendations system hidden for launch
            e.preventDefault()
            e.stopPropagation()
          }}
          disabled
          variant="neutral"
          size="sm"
          useTheme={false}
          icon={<FontAwesomeIcon icon={faHeart} className="text-red-500" />}
        >
          {t('checkMatch')}
          <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
        </LiquidGlassButton>
      </Tooltip>
    )
  }

  const scoreColor = score.score >= 70 ? 'text-green-600' : score.score >= 50 ? 'text-yellow-600' : 'text-gray-600'

  const handleToggleDetails = () => {
    setShowDetails(!showDetails)
  }

  return (
    <div className="relative">
      <LiquidGlassButton
        ref={buttonRef}
        onClick={handleToggleDetails}
        variant="secondary"
        size="sm"
        useTheme={false}
        icon={<FontAwesomeIcon icon={faHeart} className="text-red-500" />}
      >
        <span className={scoreColor}>
          {t('matchPercentage', { score: Math.round(score.score) })}
        </span>
        <FontAwesomeIcon icon={faInfoCircle} className="text-gray-400 text-xs" />
      </LiquidGlassButton>

      {showDetails && mounted && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDetails(false)}
          />
          
          {/* Details Popup */}
          <div 
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 p-3 md:p-4 min-w-[280px] max-w-[calc(100vw-2rem)] mx-4 md:mx-0"
            style={{
              top: `${popupPosition.top}px`,
              left: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1rem' 
                : `${popupPosition.left}px`,
              right: typeof window !== 'undefined' && window.innerWidth < 768 
                ? '1rem' 
                : 'auto',
            }}
          >
            <h4 className="font-semibold text-sm md:text-base text-gray-900 mb-3">{t('compatibilityBreakdown')}</h4>
            
            <div className="space-y-2 text-xs md:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('artistOverlap')}</span>
                <span className="font-semibold text-gray-900">
                  {score.components.artistOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('trackOverlap')}</span>
                <span className="font-semibold text-gray-900">
                  {score.components.trackOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('genreOverlap')}</span>
                <span className="font-semibold text-gray-900">
                  {score.components.genreOverlap.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{t('listeningPatterns')}</span>
                <span className="font-semibold text-gray-900">
                  {score.components.patternScore.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm md:text-base text-gray-900">{t('overallMatch')}</span>
                <span className={`font-bold text-base md:text-lg ${scoreColor}`}>
                  {Math.round(score.score)}%
                </span>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

