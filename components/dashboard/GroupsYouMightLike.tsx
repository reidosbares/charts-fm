'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faTimes, faUsers, faHeart } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface RecommendationGroup {
  group: {
    id: string
    name: string
    image: string | null
    colorTheme: string
    allowFreeJoin: boolean
    creator: {
      id: string
      name: string | null
      lastfmUsername: string
    }
    _count: {
      members: number
    }
  }
  score: number
  components: {
    artistOverlap: number
    trackOverlap: number
    genreOverlap: number
    patternScore: number
  }
}

export default function GroupsYouMightLike() {
  const t = useSafeTranslations('dashboard.groupsYouMightLike')
  const [recommendations, setRecommendations] = useState<RecommendationGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    handleFindGroups()
  }, [])

  const handleFindGroups = async () => {
    setIsLoading(true)
    setIsCalculating(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/dashboard/recommendations', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }

      if (data.message) {
        setError(data.message)
      } else {
        setRecommendations(data.groups || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
      console.error('Error fetching recommendations:', err)
    } finally {
      setIsLoading(false)
      setIsCalculating(false)
    }
  }

  const handleReject = async (groupId: string) => {
    try {
      const response = await fetch('/api/groups/recommendations/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject recommendation')
      }

      // Remove from list
      setRecommendations(prev => prev.filter(r => r.group.id !== groupId))
    } catch (err) {
      console.error('Error rejecting recommendation:', err)
    }
  }

  if (!hasSearched) {
    return (
      <div className="bg-[var(--surface-card)] rounded-xl shadow-sm p-6 border border-[var(--border-subtle)]">
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{t('title')}</h2>
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] mb-6">
            {t('description')}
          </p>
          <button
            onClick={handleFindGroups}
            disabled={isLoading}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                {t('finding')}
              </>
            ) : (
              t('findGroups')
            )}
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || isCalculating) {
    return (
      <div className="bg-[var(--surface-card)] rounded-xl shadow-sm p-6 border border-[var(--border-subtle)]">
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{t('title')}</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500 mb-4" />
          <p className="text-[var(--text-secondary)]">{t('calculating')}</p>
          <p className="text-sm text-[var(--text-muted)] mt-2">{t('calculatingSubtext')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--surface-card)] rounded-xl shadow-sm p-6 border border-[var(--border-subtle)]">
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{t('title')}</h2>
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] mb-4">{error}</p>
          <button
            onClick={handleFindGroups}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-[var(--surface-card)] rounded-xl shadow-sm p-6 border border-[var(--border-subtle)]">
        <h2 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">{t('title')}</h2>
        <div className="text-center py-8 text-[var(--text-muted)]">
          <p className="mb-4">{t('noRecommendations')}</p>
          <button
            onClick={handleFindGroups}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            {t('refresh')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl shadow-lg p-4 md:p-6 border border-[var(--border-subtle)] relative bg-white/60 dark:bg-[rgb(var(--surface-card-rgb)/0.6)]"
      style={{
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <button
          onClick={handleFindGroups}
          className="text-xs md:text-sm text-yellow-600 hover:text-yellow-700 font-medium"
        >
          {t('refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {recommendations.map((rec) => {
          const themeClass = `theme-${rec.group.colorTheme.replace('_', '-')}`
          const groupImage = rec.group.image || getDefaultGroupImage()

          return (
            <div
              key={rec.group.id}
              className="border border-[var(--border-subtle)] rounded-lg overflow-hidden hover:shadow-md transition-shadow relative"
            >
              {/* Reject Button */}
              <button
                onClick={() => handleReject(rec.group.id)}
                className="absolute top-2 right-2 z-10 bg-[var(--surface-card)] rounded-full p-2 shadow-sm hover:bg-[var(--surface-base)] transition-colors"
                title={t('notInterested')}
              >
                <FontAwesomeIcon icon={faTimes} className="text-[var(--text-muted)] text-sm" />
              </button>

              <Link href={`/groups/${rec.group.id}/public`}>
                <div className="p-4">
                  {/* Group Image */}
                  <div className="relative w-full h-32 mb-3 rounded-lg overflow-hidden bg-[var(--surface-base)]">
                    <SafeImage
                      src={groupImage}
                      alt={rec.group.name}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  {/* Group Name */}
                  <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)] truncate">
                    {rec.group.name}
                  </h3>

                  {/* Compatibility Score */}
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faHeart} className="text-red-500" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      {t('match', { count: Math.round(rec.score) })}
                    </span>
                  </div>

                  {/* Group Info */}
                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)] mb-3">
                    <div className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-xs" />
                      <span>{t('members', { count: rec.group._count.members })}</span>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="mt-4">
                    <div className="w-full px-4 py-2 bg-yellow-500 text-black rounded-lg text-center font-semibold">
                      {t('viewGroup')}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
