'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMusic,
  faMicrophone,
  faCompactDisc,
  faTrophy,
  faSpinner,
  faMedal,
  faCrown,
  faChartLine,
  faUser,
  faRibbon,
} from '@fortawesome/free-solid-svg-icons'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import SafeImage from '@/components/SafeImage'
import { generateSlug, ChartType } from '@/lib/chart-slugs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface GroupAllTimeTabProps {
  groupId: string
  isOwner: boolean
  userId?: string | null
}

// Map API record field to user-facing award key (records.userRecords.*)
const USER_RECORD_AWARD_KEYS: Record<string, string> = {
  userMostVS: 'vsVirtuoso',
  userMostPlays: 'playPowerhouse',
  userMostEntries: 'chartConnoisseur',
  userLeastEntries: 'hiddenGemHunter',
  userMostWeeksContributing: 'consistencyChampion',
  userTasteMaker: 'tasteMaker',
}

// Ribbon colors per award key – same scheme as RecordBlock on the records page
const AWARD_RIBBON_COLORS: Record<string, string> = {
  vsVirtuoso: 'bg-slate-400',
  playPowerhouse: 'bg-red-500',
  chartConnoisseur: 'bg-orange-500',
  hiddenGemHunter: 'bg-blue-500',
  consistencyChampion: 'bg-gray-800',
  tasteMaker: 'bg-pink-500',
}

async function fetchEntryImage(entry: {
  chartType?: string
  name: string
  artist?: string | null
}): Promise<string | null> {
  try {
    const chartType = entry.chartType || 'artists'
    if (chartType === 'artists') {
      const res = await fetch(`/api/images/artist?artist=${encodeURIComponent(entry.name)}`)
      const json = await res.json()
      return json.imageUrl ?? null
    }
    if (chartType === 'albums' && entry.artist) {
      const res = await fetch(
        `/api/images/album?artist=${encodeURIComponent(entry.artist)}&album=${encodeURIComponent(entry.name)}`
      )
      const json = await res.json()
      return json.imageUrl ?? null
    }
    if ((chartType === 'tracks' || chartType === 'albums') && entry.artist) {
      const res = await fetch(`/api/images/artist?artist=${encodeURIComponent(entry.artist)}`)
      const json = await res.json()
      return json.imageUrl ?? null
    }
  } catch {
    // ignore
  }
  return null
}

function getChartTypeIcon(chartType: string) {
  switch (chartType) {
    case 'artists':
      return faMicrophone
    case 'tracks':
      return faMusic
    case 'albums':
      return faCompactDisc
    default:
      return faMusic
  }
}

export default function GroupAllTimeTab({ groupId, isOwner, userId }: GroupAllTimeTabProps) {
  const t = useSafeTranslations('groups.allTimeStats')
  const tImpact = useSafeTranslations('records.myContribution')
  const tUserRecords = useSafeTranslations('records.userRecords')
  const [data, setData] = useState<any>(null)
  const [recordsData, setRecordsData] = useState<any>(null)
  const [impactStats, setImpactStats] = useState<any>(null)
  const [impactLoading, setImpactLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recordImages, setRecordImages] = useState<Record<string, string | null>>({})

  useEffect(() => {
    fetch(`/api/groups/${groupId}/alltime-stats`)
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
        console.error('Error fetching all-time stats:', err)
      })

    fetch(`/api/groups/${groupId}/records`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setRecordsData(data)
        }
        setRecordsLoading(false)
      })
      .catch(() => setRecordsLoading(false))
  }, [groupId, t])

  useEffect(() => {
    if (!userId) {
      setImpactStats(null)
      setImpactLoading(false)
      return
    }
    setImpactLoading(true)
    fetch(`/api/groups/${groupId}/records/personalized`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.hasStats) {
          setImpactStats(data)
        } else {
          setImpactStats(null)
        }
        setImpactLoading(false)
      })
      .catch(() => {
        setImpactStats(null)
        setImpactLoading(false)
      })
  }, [groupId, userId])

  // Fetch images for record entries (most weeks on chart, most at #1, most plays, etc.)
  useEffect(() => {
    if (!recordsData?.records) {
      setRecordImages({})
      return
    }
    const rec = recordsData.records as any
    const entries: { key: string; entry: { name: string; artist?: string | null; chartType?: string } }[] = []
    const add = (key: string, holder: { name: string; artist?: string | null; chartType?: string } | null) => {
      if (holder?.name) entries.push({ key, entry: holder })
    }
    if (rec.mostWeeksOnChart) {
      add('mwc_artists', rec.mostWeeksOnChart.artists)
      add('mwc_tracks', rec.mostWeeksOnChart.tracks)
      add('mwc_albums', rec.mostWeeksOnChart.albums)
    }
    if (rec.mostWeeksAtOne) {
      add('mwo_artists', rec.mostWeeksAtOne.artists)
      add('mwo_tracks', rec.mostWeeksAtOne.tracks)
      add('mwo_albums', rec.mostWeeksAtOne.albums)
    }
    if (rec.mostPlays) {
      add('mp_artists', rec.mostPlays.artists)
      add('mp_tracks', rec.mostPlays.tracks)
      add('mp_albums', rec.mostPlays.albums)
    }
    if (rec.mostConsecutiveWeeks) {
      add('mc_artists', rec.mostConsecutiveWeeks.artists)
      add('mc_tracks', rec.mostConsecutiveWeeks.tracks)
      add('mc_albums', rec.mostConsecutiveWeeks.albums)
    }
    const next: Record<string, string | null> = {}
    entries.forEach(({ key, entry }) => {
      fetchEntryImage(entry).then((url) => {
        next[key] = url
        setRecordImages((prev) => ({ ...prev, ...next }))
      })
    })
  }, [recordsData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 md:py-12">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
      </div>
    )
  }

  if (
    error ||
    !data ||
    !data.allTimeStats ||
    (data.allTimeStats.topArtists as any[]).length === 0
  ) {
    return (
      <div>
        <div className="rounded-2xl p-4 md:p-6 backdrop-blur-md bg-white/70 border border-white/50 shadow-lg text-center">
          <div className="mb-4 text-[var(--theme-primary)]">
            <FontAwesomeIcon icon={faTrophy} className="text-4xl md:text-5xl" />
          </div>
          <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{t('noStatsAvailable')}</p>
          <p className="text-gray-500 text-sm mb-4 md:mb-6">{t('generateChartsToStart')}</p>
          {!data?.hasWeeklyStats && isOwner && (
            <LiquidGlassLink
              href={`/groups/${groupId}/settings?tab=regenerate`}
              variant="primary"
              useTheme
            >
              {t('generateCharts')}
            </LiquidGlassLink>
          )}
        </div>
      </div>
    )
  }

  const rec = recordsData?.status === 'completed' ? (recordsData.records as any) : null

  const cardBase =
    'rounded-2xl p-3 md:p-5 backdrop-blur-md bg-white/70 border border-white/50 shadow-lg'
  const cardFeatured =
    'rounded-2xl p-4 md:p-6 backdrop-blur-md bg-white/70 border border-white/50 shadow-lg ring-1 ring-white/30'

  // Collect award-holding members with all awards each holds (for contextual display + ribbons)
  const userRecordFields = [
    'userMostVS',
    'userMostPlays',
    'userMostEntries',
    'userLeastEntries',
    'userMostWeeksContributing',
    'userTasteMaker',
  ]
  const awardHoldersMap = new Map<
    string,
    { userId: string; name: string; image: string | null; lastfmUsername: string | null; awards: string[] }
  >()
  if (rec) {
    userRecordFields.forEach((field) => {
      const holder = rec[field]
      if (!holder?.userId) return
      const awardKey = USER_RECORD_AWARD_KEYS[field] || 'tasteMaker'
      const existing = awardHoldersMap.get(holder.userId)
      if (existing) {
        if (!existing.awards.includes(awardKey)) existing.awards.push(awardKey)
      } else {
        awardHoldersMap.set(holder.userId, {
          userId: holder.userId,
          name: holder.name || holder.lastfmUsername || 'Member',
          image: holder.image ?? null,
          lastfmUsername: holder.lastfmUsername ?? null,
          awards: [awardKey],
        })
      }
    })
  }
  const awardHolders = Array.from(awardHoldersMap.values())

  const renderRecordCard = (
    titleKey: string,
    artist: { name: string; artist?: string | null; value: number; slug: string; chartType?: string } | null,
    track: typeof artist,
    album: typeof artist,
    imageKeys: { artist: string; track: string; album: string },
    valueKind: 'weeks' | 'plays' = 'weeks'
  ) => {
    const items = [
      { type: 'artists' as const, data: artist, imgKey: imageKeys.artist },
      { type: 'tracks' as const, data: track, imgKey: imageKeys.track },
      { type: 'albums' as const, data: album, imgKey: imageKeys.album },
    ].filter((x) => x.data?.name)
    if (items.length === 0) return null
    return (
      <div className={cardBase}>
        <div className="text-xs md:text-sm text-gray-600 mb-2 md:mb-3 font-semibold">{t(titleKey)}</div>
        <div className="space-y-2 md:space-y-3">
          {items.map(({ type, data: d, imgKey }) => {
            const img = recordImages[imgKey] ?? null
            const href =
              type === 'artists'
                ? `/groups/${groupId}/charts/artist/${d!.slug}`
                : type === 'tracks'
                  ? `/groups/${groupId}/charts/track/${d!.slug}`
                  : `/groups/${groupId}/charts/album/${d!.slug}`
            const valueLabel =
              valueKind === 'plays'
                ? t('plays', { count: d!.value.toLocaleString() })
                : d!.value === 1
                  ? t('weeksOnChart', { count: d!.value })
                  : t('weeksOnChartPlural', { count: d!.value })
            return (
              <Link
                key={type}
                href={href}
                className="flex items-center gap-2 md:gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)]/50 transition-colors border border-transparent hover:border-[var(--theme-border)]"
              >
                {img ? (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--theme-primary-lighter)] ring-1 ring-[var(--theme-border)]">
                    <SafeImage src={img} alt={d!.name} className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-[var(--theme-primary-lighter)] flex-shrink-0">
                    <FontAwesomeIcon
                      icon={getChartTypeIcon(type)}
                      className="text-[var(--theme-primary)] text-lg"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900 block truncate">{d!.name}</span>
                  {d!.artist && (
                    <span className="text-xs text-gray-600 truncate block">{t('by', { artist: d!.artist })}</span>
                  )}
                  <span className="text-xs text-gray-500">{valueLabel}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Records section – prominent bento */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 md:mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--theme-primary-dark)] flex items-center gap-2">
            <FontAwesomeIcon icon={faMedal} className="text-[var(--theme-primary)] flex-shrink-0" />
            {t('records')}
          </h2>
          <LiquidGlassLink href={`/groups/${groupId}/records`} variant="primary" useTheme>
            {t('viewAllRecords')}
          </LiquidGlassLink>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Award holders gallery – one card with current record-holding members */}
          {!recordsLoading && awardHolders.length > 0 && (
            <div className={`${cardFeatured} md:col-span-2 lg:col-span-1 order-first lg:order-none`}>
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faCrown} className="text-xl text-[var(--theme-primary)] flex-shrink-0" />
                <h3 className="text-lg font-bold text-[var(--theme-primary-dark)]">{t('awardHolders')}</h3>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">{t('awardHoldersTagline')}</p>
              <div className="flex flex-wrap gap-3 md:gap-4">
                {awardHolders.slice(0, 8).map((holder) => (
                  <Link
                    key={holder.userId}
                    href={`/u/${encodeURIComponent(holder.lastfmUsername || holder.name)}`}
                    className="flex flex-col items-center gap-1.5 group min-w-0"
                    title={holder.name}
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[var(--theme-border)] group-hover:ring-[var(--theme-primary)] transition-all bg-[var(--theme-primary-lighter)]">
                      <SafeImage
                        src={holder.image || ''}
                        alt={holder.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[72px] md:max-w-[80px] text-center group-hover:text-[var(--theme-primary)]">
                      {holder.name}
                    </span>
                    <div className="flex flex-wrap justify-center gap-1">
                      {holder.awards.map((awardKey) => {
                        const ribbonColor = AWARD_RIBBON_COLORS[awardKey] || 'bg-gray-500'
                        return (
                          <span
                            key={awardKey}
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${ribbonColor} text-white`}
                            title={tUserRecords(awardKey)}
                          >
                            <FontAwesomeIcon icon={faRibbon} className="text-[10px]" />
                          </span>
                        )
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Most weeks on chart */}
          {rec?.mostWeeksOnChart &&
            renderRecordCard(
              'recordMostWeeksOnChart',
              rec.mostWeeksOnChart.artists,
              rec.mostWeeksOnChart.tracks,
              rec.mostWeeksOnChart.albums,
              { artist: 'mwc_artists', track: 'mwc_tracks', album: 'mwc_albums' }
            )}

          {/* Most weeks at #1 */}
          {rec?.mostWeeksAtOne &&
            renderRecordCard(
              'recordMostWeeksAtOne',
              rec.mostWeeksAtOne.artists,
              rec.mostWeeksAtOne.tracks,
              rec.mostWeeksAtOne.albums,
              { artist: 'mwo_artists', track: 'mwo_tracks', album: 'mwo_albums' }
            )}

          {/* Most plays */}
          {rec?.mostPlays &&
            renderRecordCard(
              'recordMostPlays',
              rec.mostPlays.artists,
              rec.mostPlays.tracks,
              rec.mostPlays.albums,
              { artist: 'mp_artists', track: 'mp_tracks', album: 'mp_albums' },
              'plays'
            )}

          {/* Most consecutive weeks */}
          {rec?.mostConsecutiveWeeks &&
            renderRecordCard(
              'recordMostConsecutive',
              rec.mostConsecutiveWeeks.artists,
              rec.mostConsecutiveWeeks.tracks,
              rec.mostConsecutiveWeeks.albums,
              { artist: 'mc_artists', track: 'mc_tracks', album: 'mc_albums' }
            )}

          {/* Your impact – double-height card (fills empty space on the right) */}
          {userId && (
            <div
              className={`${cardFeatured} min-h-[200px] md:min-h-[240px] lg:col-start-3 lg:row-span-2 lg:row-start-2 flex flex-col`}
            >
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faUser} className="text-xl text-[var(--theme-primary)] flex-shrink-0" />
                <h3 className="text-lg font-bold text-[var(--theme-primary-dark)]">{tImpact('title')}</h3>
              </div>
              {impactLoading ? (
                <div className="flex-1 flex items-center justify-center py-8">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
                </div>
              ) : impactStats ? (
                <div className="flex-1 flex flex-col gap-4 md:gap-5">
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-white/80 border border-[var(--theme-border)]">
                      <div className="text-xs text-gray-600 mb-0.5">{tImpact('totalVS')}</div>
                      <div className="text-xl md:text-2xl font-bold text-[var(--theme-text)]">
                        {typeof impactStats.totalVS === 'number'
                          ? impactStats.totalVS.toLocaleString(undefined, { maximumFractionDigits: 0 })
                          : impactStats.totalVS}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/80 border border-[var(--theme-border)]">
                      <div className="text-xs text-gray-600 mb-0.5">{tImpact('totalPlays')}</div>
                      <div className="text-xl md:text-2xl font-bold text-[var(--theme-text)]">
                        {(impactStats.totalPlays ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/80 border border-[var(--theme-border)]">
                      <div className="text-xs text-gray-600 mb-0.5">{tImpact('weeksAsMVP')}</div>
                      <div className="text-xl md:text-2xl font-bold text-[var(--theme-primary)]">
                        {(impactStats.weeksAsMVP ?? 0).toLocaleString()}
                      </div>
                    </div>
                    {impactStats.byChartType && (() => {
                      const bt = impactStats.byChartType
                      const totalDebuts =
                        (bt.artists?.entriesHelpedDebut ?? 0) +
                        (bt.tracks?.entriesHelpedDebut ?? 0) +
                        (bt.albums?.entriesHelpedDebut ?? 0)
                      if (totalDebuts === 0) return null
                      return (
                        <div className="p-3 rounded-xl bg-white/80 border border-[var(--theme-border)]">
                          <div className="text-xs text-gray-600 mb-0.5">{tImpact('entriesHelpedDebut')}</div>
                          <div className="text-lg font-bold text-[var(--theme-text)]">{totalDebuts.toLocaleString()}</div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 flex-1">{tImpact('noStats')}</p>
              )}
            </div>
          )}

          {/* Most weeks as MVP – prominent featured card */}
          {!recordsLoading && recordsData?.mostWeeksAsMVP && (
            <div className={`${cardFeatured} md:col-span-2`}>
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <FontAwesomeIcon icon={faTrophy} className="text-2xl md:text-3xl text-[var(--theme-primary)] flex-shrink-0" />
                <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)]">{t('mostWeeksAsMVP')}</h3>
              </div>
              <p className="text-xs md:text-sm text-gray-600 mb-4">{t('mostWeeksAsMVPTagline')}</p>
              <Link
                href={`/u/${encodeURIComponent(recordsData.mostWeeksAsMVP.lastfmUsername || recordsData.mostWeeksAsMVP.name)}`}
                className="flex items-center gap-4 md:gap-5 p-4 rounded-xl bg-white/80 border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 transition-all"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[var(--theme-primary)]/50 bg-[var(--theme-primary-lighter)]">
                  <SafeImage
                    src={recordsData.mostWeeksAsMVP.image || ''}
                    alt={recordsData.mostWeeksAsMVP.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xl md:text-2xl font-bold text-gray-900 block truncate">{recordsData.mostWeeksAsMVP.name}</span>
                  <span className="text-base md:text-lg text-[var(--theme-primary)] font-semibold">
                    {recordsData.mostWeeksAsMVP.value === 1
                      ? t('weeksAsMVPCount', { count: recordsData.mostWeeksAsMVP.value })
                      : t('weeksAsMVPCountPlural', { count: recordsData.mostWeeksAsMVP.value })}
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Top 100 All-Time – callout only */}
      <div className="mb-4">
        <div className={`${cardFeatured} rounded-2xl p-4 md:p-6 backdrop-blur-md border border-[var(--theme-primary)]/30 shadow-lg bg-gradient-to-br from-[var(--theme-primary-lighter)]/40 via-white/70 to-white/80`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl flex items-center justify-center bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex-shrink-0">
                <FontAwesomeIcon icon={faChartLine} className="text-xl md:text-2xl" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-0.5">
                  {t('top100AllTime')}
                </h3>
                <p className="text-sm md:text-base text-gray-600">{t('viewCompleteTable')}</p>
              </div>
            </div>
            <LiquidGlassLink
              href={`/groups/${groupId}/alltime`}
              variant="primary"
              useTheme
              className="flex-shrink-0 w-full sm:w-auto justify-center"
            >
              {t('viewCompleteTable')}
            </LiquidGlassLink>
          </div>
        </div>
      </div>
    </div>
  )
}
