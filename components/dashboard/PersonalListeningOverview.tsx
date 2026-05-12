'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faArrowUp, faArrowDown, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { formatChartWeekLabel, getChartWeekReferenceDate } from '@/lib/weekly-utils'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import type { StatsRange } from '@/lib/dashboard-queries'

interface PersonalListeningStats {
  currentWeek: {
    topArtists: Array<{ name: string; playcount: number }>
    topTracks: Array<{ name: string; artist: string; playcount: number }>
    topAlbums: Array<{ name: string; artist: string; playcount: number }>
    totalPlays: number
    uniqueArtists: number
    uniqueTracks: number
  } | null
  previousWeek: {
    totalPlays: number
  } | null
  weekStart: string
  periodEnd?: string
}

const RANGES: StatsRange[] = ['week', '4weeks', 'alltime']

export default function PersonalListeningOverview({
  username,
}: {
  username?: string
}) {
  const t = useSafeTranslations('dashboard.personalListening')
  const [range, setRange] = useState<StatsRange>('week')

  const base = username
    ? `/api/users/${encodeURIComponent(username)}/personal-stats`
    : '/api/dashboard/personal-stats'
  const endpoint = range === 'week' ? base : `${base}?range=${range}`

  const { data: stats, error: swrError, isLoading } = useSWR<PersonalListeningStats>(endpoint)
  const error = swrError ? t('failedToLoad') : stats && 'error' in stats ? (stats as any).error : null

  // All hooks must be called before any conditional returns
  const currentWeek = stats?.currentWeek ?? null
  const previousWeek = stats?.previousWeek ?? null

  const weekStartDate = useMemo(() => {
    if (!stats?.weekStart) return new Date()
    return new Date(stats.weekStart)
  }, [stats?.weekStart])

  const periodEndDate = useMemo(() => {
    if (!stats?.periodEnd) return null
    return new Date(stats.periodEnd)
  }, [stats?.periodEnd])

  const periodLabel = useMemo(() => {
    if (range === 'week') {
      return t('weekOf', { date: formatChartWeekLabel(weekStartDate) })
    }
    if (range === '4weeks') {
      return periodEndDate
        ? `${formatChartWeekLabel(weekStartDate)} – ${formatChartWeekLabel(periodEndDate)}`
        : formatChartWeekLabel(weekStartDate)
    }
    // alltime (labels use chart-reference day for each compiled week)
    if (periodEndDate) {
      const startRef = getChartWeekReferenceDate(weekStartDate)
      const endRef = getChartWeekReferenceDate(periodEndDate)
      const startYear = startRef.getUTCFullYear()
      const endYear = endRef.getUTCFullYear()
      const startStr = startRef.toLocaleString('default', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      const endStr = endRef.toLocaleString('default', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      return startYear === endYear
        ? `${startStr} – ${endRef.toLocaleString('default', { month: 'short', timeZone: 'UTC' })} ${endYear}`
        : `${startStr} – ${endStr}`
    }
    return formatChartWeekLabel(weekStartDate)
  }, [range, weekStartDate, periodEndDate, t])

  // Memoize computed values - safe to call even if data is null
  const { playsChange, playsChangePercent } = useMemo(() => {
    if (!previousWeek || !currentWeek) {
      return { playsChange: null, playsChangePercent: null }
    }
    const change = currentWeek.totalPlays - previousWeek.totalPlays
    const percent = previousWeek.totalPlays > 0
      ? ((change / previousWeek.totalPlays) * 100).toFixed(1)
      : null
    return { playsChange: change, playsChangePercent: percent }
  }, [currentWeek, previousWeek])

  // Memoize top items lists - safe to call even if data is null
  const topArtists = useMemo(() => {
    if (!currentWeek?.topArtists) return []
    return currentWeek.topArtists.slice(0, 5)
  }, [currentWeek?.topArtists])
  
  const topTracks = useMemo(() => {
    if (!currentWeek?.topTracks) return []
    return currentWeek.topTracks.slice(0, 5)
  }, [currentWeek?.topTracks])
  
  const topAlbums = useMemo(() => {
    if (!currentWeek?.topAlbums) return []
    return currentWeek.topAlbums.slice(0, 5)
  }, [currentWeek?.topAlbums])

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  }

  // Now we can safely return early after all hooks have been called
  if (isLoading) {
    return (
      <div
        className="rounded-xl shadow-lg p-4 md:p-6 border border-[var(--border-subtle)]"
        style={glassStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {username ? t('titleForUser', { username }) : t('title')}
          </h2>
          <div
            className="flex items-center rounded-lg border border-[var(--border-subtle)] p-0.5 opacity-60"
            style={{ background: 'rgba(255,255,255,0.5)' }}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                disabled
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  range === r ? 'bg-yellow-400 text-white shadow-sm' : 'text-[var(--text-muted)]'
                }`}
              >
                {t(`range.${r}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || !stats || !currentWeek) {
    return (
      <div
        className="rounded-xl shadow-lg p-4 md:p-6 border border-[var(--border-subtle)]"
        style={glassStyle}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">
          {username ? t('titleForUser', { username }) : t('title')}
        </h2>
        <div className="text-center py-8 text-[var(--text-muted)]">
          <p className="mb-2">{t('noData')}</p>
          <p className="text-sm">{t('noDataDescription')}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="rounded-xl shadow-lg p-4 md:p-6 border border-theme"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 md:mb-6 gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
          {username ? t('titleForUser', { username }) : t('title')}
        </h2>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          {/* Range selector */}
          <div
            className="flex items-center rounded-lg border border-[var(--border-subtle)] p-0.5"
            style={{ background: 'rgba(255,255,255,0.5)' }}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  range === r
                    ? 'bg-yellow-400 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50'
                }`}
              >
                {t(`range.${r}`)}
              </button>
            ))}
          </div>
          {/* Period label */}
          {currentWeek && (
            <span className="text-xs text-[var(--text-muted)]">{periodLabel}</span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-xs md:text-sm text-[var(--text-secondary)] font-medium mb-1">{t('totalPlays')}</div>
          <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{currentWeek.totalPlays.toLocaleString()}</div>
          {playsChange !== null && (
            <div className="flex items-center gap-1 mt-1 text-xs">
              {playsChange > 0 ? (
                <>
                  <FontAwesomeIcon icon={faArrowUp} className="text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">+{playsChange.toLocaleString()}</span>
                  {playsChangePercent && <span className="text-[var(--text-muted)]">({playsChangePercent}%)</span>}
                </>
              ) : playsChange < 0 ? (
                <>
                  <FontAwesomeIcon icon={faArrowDown} className="text-red-600 dark:text-red-400" />
                  <span className="text-red-600 dark:text-red-400">{playsChange.toLocaleString()}</span>
                  {playsChangePercent && <span className="text-[var(--text-muted)]">({playsChangePercent}%)</span>}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faMinus} className="text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">{t('noChange')}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-xs md:text-sm text-[var(--text-secondary)] font-medium mb-1">{t('uniqueArtists')}</div>
          <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{currentWeek.uniqueArtists}</div>
        </div>

        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-xs md:text-sm text-[var(--text-secondary)] font-medium mb-1">{t('uniqueTracks')}</div>
          <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{currentWeek.uniqueTracks}</div>
        </div>

        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-xs md:text-sm text-[var(--text-secondary)] font-medium mb-1">{t('topItems')}</div>
          <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {currentWeek.topArtists.length + currentWeek.topTracks.length + currentWeek.topAlbums.length}
          </div>
        </div>
      </div>

      {/* Top Items Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Top Artists */}
        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faMicrophone} className="text-[var(--text-secondary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">{t('topArtists')}</h3>
          </div>
          <ol className="space-y-2">
            {topArtists.map((artist, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                  {idx + 1}
                </span>
                <span className="font-medium text-[var(--text-primary)] truncate">{artist.name}</span>
                <span className="ml-auto text-[var(--text-muted)] text-xs">{t('plays', { count: artist.playcount })}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Tracks */}
        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faMusic} className="text-[var(--text-secondary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">{t('topTracks')}</h3>
          </div>
          <ol className="space-y-2">
            {topTracks.map((track, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{track.name}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{t('by', { artist: track.artist })}</div>
                </div>
                <span className="ml-auto text-[var(--text-muted)] text-xs flex-shrink-0">{track.playcount}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Albums */}
        <div 
          className="rounded-lg p-3 md:p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faCompactDisc} className="text-[var(--text-secondary)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">{t('topAlbums')}</h3>
          </div>
          <ol className="space-y-2">
            {topAlbums.map((album, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--border-strong)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)] mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{album.name}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{t('by', { artist: album.artist })}</div>
                </div>
                <span className="ml-auto text-[var(--text-muted)] text-xs flex-shrink-0">{album.playcount}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

