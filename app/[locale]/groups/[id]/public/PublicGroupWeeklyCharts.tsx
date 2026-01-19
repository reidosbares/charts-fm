'use client'

import { useState, useEffect } from 'react'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface PublicGroupWeeklyChartsProps {
  groupId: string
  chartMode: string
}

// Helper function to get entry key for matching
function getEntryKey(item: { name: string; artist?: string }, chartType: string): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

// Helper function to format display value (VS or plays)
function formatDisplayValue(
  item: { name: string; artist?: string; playcount: number },
  chartType: string,
  showVS: boolean,
  vsMap: Record<string, number>,
  t: any
): string {
  if (showVS) {
    const entryKey = getEntryKey(item, chartType)
    const vs = vsMap[`${chartType}|${entryKey}`]
    if (vs !== undefined && vs !== null) {
      return `${vs.toFixed(2)} ${t('vs')}`
    }
  }
  return t('plays', { count: item.playcount })
}

export default function PublicGroupWeeklyCharts({ groupId, chartMode }: PublicGroupWeeklyChartsProps) {
  const t = useSafeTranslations('groups.weeklyCharts')
  const tQuickStats = useSafeTranslations('groups.quickStats')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/public/weekly-charts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError(t('failedToLoad'))
        setIsLoading(false)
        console.error('Error fetching public weekly charts:', err)
      })
  }, [groupId, t])

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="flex items-center justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.weeks || data.weeks.length === 0) {
    return (
      <>
        {data && data.weeksTracked > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 md:mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-xs md:text-sm text-gray-600 mb-1">{t('public.totalPlaysThisWeek')}</div>
              <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
                {data.totalPlaysThisWeek?.toLocaleString() || 0} <span className="text-base md:text-lg font-normal">{tQuickStats('plays')}</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-xs md:text-sm text-gray-600 mb-1">{tQuickStats('weeksTracked')}</div>
              <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
                {data.weeksTracked || 0} <span className="text-base md:text-lg font-normal">{tQuickStats('weeks')}</span>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-xs md:text-sm text-gray-600 mb-1">{tQuickStats('chartMode')}</div>
              <div className="text-base md:text-lg font-bold text-[var(--theme-text)] capitalize">
                {data.chartMode === 'vs' ? tQuickStats('vibeScore') : data.chartMode === 'vs_weighted' ? tQuickStats('vibeScoreWeighted') : tQuickStats('playsOnly')}
              </div>
            </div>
          </div>
        )}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--theme-primary-dark)] mb-4 md:mb-6">
            {t('title')}
          </h2>
          <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
            <div className="mb-4 text-[var(--theme-primary)]">
              <FontAwesomeIcon icon={faMusic} size="2x" className="md:hidden" />
              <FontAwesomeIcon icon={faMusic} size="3x" className="hidden md:inline" />
            </div>
            <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{t('noChartsAvailable')}</p>
            <p className="text-gray-500 text-xs md:text-sm">{t('public.noChartsDescription')}</p>
          </div>
        </div>
      </>
    )
  }

  const { weeks, showVS } = data

  return (
    <>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 md:mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{t('public.totalPlaysThisWeek')}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
            {data.totalPlaysThisWeek.toLocaleString()} <span className="text-base md:text-lg font-normal">{tQuickStats('plays')}</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{tQuickStats('weeksTracked')}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
            {data.weeksTracked} <span className="text-base md:text-lg font-normal">{tQuickStats('weeks')}</span>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{tQuickStats('chartMode')}</div>
          <div className="text-base md:text-lg font-bold text-[var(--theme-text)] capitalize">
            {data.chartMode === 'vs' ? tQuickStats('vibeScore') : data.chartMode === 'vs_weighted' ? tQuickStats('vibeScoreWeighted') : tQuickStats('playsOnly')}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--theme-primary-dark)] mb-4 md:mb-6">
          {t('title')}
        </h2>
        <div className="space-y-4 md:space-y-6">
          {weeks.map((week: any) => {
            const vsMap = week.vsMap || {}
            const positionChangeMap = week.positionChangeMap || {}
            const entryTypeMap = week.entryTypeMap || {}
            const topArtists = week.topArtists || []
            const topTracks = week.topTracks || []
            const topAlbums = week.topAlbums || []
            
            return (
              <div key={week.id} className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 md:p-6 border border-theme">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">
                  {t('weekOf', { date: week.weekStartFormatted })}
                  <span className="text-xs md:text-sm font-normal italic text-gray-500 ml-1 md:ml-2 block sm:inline">
                    ({t('fromTo', { start: week.weekStartFormatted, end: week.weekEndFormatted })})
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Top Artists */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
                    <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faMicrophone} style={{ width: '1em', height: '1em' }} />
                      {t('topArtists')}
                    </h4>
                    <div className="space-y-2 md:space-y-3">
                      {topArtists.slice(0, 3).map((artist: any, idx: number) => {
                        const displayValue = formatDisplayValue(artist, 'artists', showVS, vsMap, t)
                        const entryKey = getEntryKey(artist, 'artists')
                        const positionChange = positionChangeMap[`artists|${entryKey}`]
                        const entryType = entryTypeMap[`artists|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 min-w-0">
                                <span className="truncate">{artist.name}</span>
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                              </div>
                              <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium truncate">{displayValue}</div>
                            </div>
                          </div>
                        )
                      })}
                      {topArtists.length > 3 && (
                        <div className="pt-2 border-t border-[var(--theme-border)]">
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            {topArtists.slice(3, 10).map((artist: any, idx: number) => {
                              const entryKey = getEntryKey(artist, 'artists')
                              const positionChange = positionChangeMap[`artists|${entryKey}`]
                              const entryType = entryTypeMap[`artists|${entryKey}`]
                              return (
                                <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                                  <span className="truncate">{artist.name}</span> <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" /> <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(artist, 'artists', showVS, vsMap, t)})</span>
                                </li>
                              )
                            })}
                          </ol>
                          {topArtists.length > 10 && (
                            <p className="text-xs text-gray-500 mt-2">
                              {t('andMore', { count: topArtists.length - 10 })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Top Tracks */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
                    <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faMusic} style={{ width: '1em', height: '1em' }} />
                      {t('topTracks')}
                    </h4>
                    <div className="space-y-2 md:space-y-3">
                      {topTracks.slice(0, 3).map((track: any, idx: number) => {
                        const displayValue = formatDisplayValue(track, 'tracks', showVS, vsMap, t)
                        const entryKey = getEntryKey(track, 'tracks')
                        const positionChange = positionChangeMap[`tracks|${entryKey}`]
                        const entryType = entryTypeMap[`tracks|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 min-w-0">
                                <span className="truncate">{track.name}</span>
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                              </div>
                              <div className="text-xs text-gray-600 truncate">{t('by', { artist: track.artist })}</div>
                              <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium mt-1 truncate">{displayValue}</div>
                            </div>
                          </div>
                        )
                      })}
                      {topTracks.length > 3 && (
                        <div className="pt-2 border-t border-[var(--theme-border)]">
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            {topTracks.slice(3, 10).map((track: any, idx: number) => {
                              const entryKey = getEntryKey(track, 'tracks')
                              const positionChange = positionChangeMap[`tracks|${entryKey}`]
                              const entryType = entryTypeMap[`tracks|${entryKey}`]
                              return (
                                <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                                  <span className="truncate">{track.name} {t('by', { artist: track.artist })}</span> <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" /> <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(track, 'tracks', showVS, vsMap, t)})</span>
                                </li>
                              )
                            })}
                          </ol>
                          {topTracks.length > 10 && (
                            <p className="text-xs text-gray-500 mt-2">
                              {t('andMore', { count: topTracks.length - 10 })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Top Albums */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
                    <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faCompactDisc} style={{ width: '1em', height: '1em' }} />
                      {t('topAlbums')}
                    </h4>
                    <div className="space-y-2 md:space-y-3">
                      {topAlbums.slice(0, 3).map((album: any, idx: number) => {
                        const displayValue = formatDisplayValue(album, 'albums', showVS, vsMap, t)
                        const entryKey = getEntryKey(album, 'albums')
                        const positionChange = positionChangeMap[`albums|${entryKey}`]
                        const entryType = entryTypeMap[`albums|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 min-w-0">
                                <span className="truncate">{album.name}</span>
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                              </div>
                              <div className="text-xs text-gray-600 truncate">{t('by', { artist: album.artist })}</div>
                              <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium mt-1 truncate">{displayValue}</div>
                            </div>
                          </div>
                        )
                      })}
                      {topAlbums.length > 3 && (
                        <div className="pt-2 border-t border-[var(--theme-border)]">
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            {topAlbums.slice(3, 10).map((album: any, idx: number) => {
                              const entryKey = getEntryKey(album, 'albums')
                              const positionChange = positionChangeMap[`albums|${entryKey}`]
                              const entryType = entryTypeMap[`albums|${entryKey}`]
                              return (
                                <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                                  <span className="truncate">{album.name} {t('by', { artist: album.artist })}</span> <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" /> <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(album, 'albums', showVS, vsMap, t)})</span>
                                </li>
                              )
                            })}
                          </ol>
                          {topAlbums.length > 10 && (
                            <p className="text-xs text-gray-500 mt-2">
                              {t('andMore', { count: topAlbums.length - 10 })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

