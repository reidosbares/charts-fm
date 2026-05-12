'use client'

import { useState, useEffect } from 'react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'

interface UserRanking {
  userId: string
  name: string
  value: number
  image?: string | null
  lastfmUsername?: string
}

interface UserOneTrackMindRanking extends UserRanking {
  entryName: string
  entryArtist: string | null
}

interface AwardsRankingsClientProps {
  groupId: string
  records: {
    status: string
    records: any
  } | null
}

// Award definitions with slugs, data keys, and color schemes
const AWARDS = [
  {
    slug: 'vs-virtuoso',
    translationKey: 'vsVirtuoso',
    dataKey: 'userMostVSRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('vs')}`,
    bgGradient: 'from-amber-50 to-yellow-50',
    borderColor: 'border-amber-300 dark:border-amber-700/60',
    activeTabBg: 'bg-amber-100 dark:bg-amber-500/15',
    activeTabText: 'text-amber-800 dark:text-amber-300',
    activeTabBorder: 'border-amber-400 dark:border-amber-500/40',
    highlightBg: 'bg-amber-50 dark:bg-amber-500/10',
    ribbonColor: 'bg-amber-500',
  },
  {
    slug: 'play-powerhouse',
    translationKey: 'playPowerhouse',
    dataKey: 'userMostPlaysRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('plays')}`,
    bgGradient: 'from-red-50 to-rose-50',
    borderColor: 'border-red-300 dark:border-red-700/60',
    activeTabBg: 'bg-red-100 dark:bg-red-500/15',
    activeTabText: 'text-red-800 dark:text-red-300',
    activeTabBorder: 'border-red-400 dark:border-red-500/40',
    highlightBg: 'bg-red-50 dark:bg-red-500/10',
    ribbonColor: 'bg-red-500',
  },
  {
    slug: 'chart-connoisseur',
    translationKey: 'chartConnoisseur',
    dataKey: 'userMostEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-sky-50 to-blue-50',
    borderColor: 'border-sky-300 dark:border-sky-700/60',
    activeTabBg: 'bg-sky-100 dark:bg-sky-500/15',
    activeTabText: 'text-sky-800 dark:text-sky-300',
    activeTabBorder: 'border-sky-400 dark:border-sky-500/40',
    highlightBg: 'bg-sky-50 dark:bg-sky-500/10',
    ribbonColor: 'bg-sky-500',
  },
  {
    slug: 'hidden-gem-hunter',
    translationKey: 'hiddenGemHunter',
    dataKey: 'userLeastEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-300 dark:border-teal-700/60',
    activeTabBg: 'bg-teal-100 dark:bg-teal-500/15',
    activeTabText: 'text-teal-800 dark:text-teal-300',
    activeTabBorder: 'border-teal-400 dark:border-teal-500/40',
    highlightBg: 'bg-teal-50 dark:bg-teal-500/10',
    ribbonColor: 'bg-teal-500',
  },
  {
    slug: 'one-track-mind',
    translationKey: 'oneTrackMind',
    dataKey: 'userOneTrackMindRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('vs')}`,
    bgGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-300 dark:border-violet-700/60',
    activeTabBg: 'bg-violet-100 dark:bg-violet-500/15',
    activeTabText: 'text-violet-800 dark:text-violet-300',
    activeTabBorder: 'border-violet-400 dark:border-violet-500/40',
    highlightBg: 'bg-violet-50 dark:bg-violet-500/10',
    ribbonColor: 'bg-violet-500',
  },
  {
    slug: 'taste-maker',
    translationKey: 'tasteMaker',
    dataKey: 'userTasteMakerRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-pink-50 to-fuchsia-50',
    borderColor: 'border-pink-300 dark:border-pink-700/60',
    activeTabBg: 'bg-pink-100 dark:bg-pink-500/15',
    activeTabText: 'text-pink-800 dark:text-pink-300',
    activeTabBorder: 'border-pink-400 dark:border-pink-500/40',
    highlightBg: 'bg-pink-50 dark:bg-pink-500/10',
    ribbonColor: 'bg-pink-500',
  },
] as const

function assignRanks(rankings: UserRanking[]): (UserRanking & { rank: number })[] {
  let currentRank = 1
  return rankings.map((r, idx) => {
    if (idx > 0 && r.value !== rankings[idx - 1].value) {
      currentRank = idx + 1
    }
    return { ...r, rank: currentRank }
  })
}

export default function AwardsRankingsClient({ groupId, records }: AwardsRankingsClientProps) {
  const tUserRecords = useSafeTranslations('records.userRecords')
  const tAwards = useSafeTranslations('records.awards')
  const tAwardDescriptions = useSafeTranslations('records.userRecords.awardDescriptions')
  const tStatus = useSafeTranslations('records.status')

  const [activeAward, setActiveAward] = useState<string>(AWARDS[0].slug)

  // Read hash on mount to pre-select award
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const match = AWARDS.find(a => a.slug === hash)
      if (match) setActiveAward(match.slug)
    }
  }, [])

  // Update hash when tab changes
  const handleTabChange = (slug: string) => {
    setActiveAward(slug)
    window.history.replaceState(null, '', `#${slug}`)
  }

  if (!records || records.status !== 'completed' || !records.records) {
    return (
      <div className="text-center py-8 md:py-12">
        <p className="text-sm md:text-base text-[var(--text-secondary)]">{tStatus('noRecordsForCategory')}</p>
      </div>
    )
  }

  const recordsData = records.records as any
  const currentAwardDef = AWARDS.find(a => a.slug === activeAward) || AWARDS[0]
  const rankings = (recordsData[currentAwardDef.dataKey] || []) as (UserRanking | UserOneTrackMindRanking)[]
  const rankedList = assignRanks(rankings)

  // Compute the 10-week window dates (same logic as getTenWeekCutoffDate in group-records.ts)
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - (10 * 7))
  cutoff.setUTCHours(0, 0, 0, 0)

  const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="mt-6">
      {/* Date range subtitle */}
      <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-4">
        {tUserRecords('sectionSubtitle')} ({formatDate(cutoff)} — {formatDate(now)})
      </p>

      {/* Tab selector — horizontally scrollable on mobile with mask fade */}
      <div className="mb-6 -mx-4 px-4 md:mx-0 md:px-0" style={{ WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 3rem), transparent)', maskImage: 'linear-gradient(to right, black calc(100% - 3rem), transparent)' }}>
        <div className="overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-1.5 sm:gap-2 min-w-max pr-10 md:pr-0">
            {AWARDS.map((award) => {
              const isActive = activeAward === award.slug
              return (
                <button
                  key={award.slug}
                  onClick={() => handleTabChange(award.slug)}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium transition-all whitespace-nowrap border ${
                    isActive
                      ? `${award.activeTabBg} ${award.activeTabText} ${award.activeTabBorder}`
                      : 'bg-white/80 dark:bg-[var(--surface-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--surface-base)]'
                  }`}
                >
                  {tUserRecords(award.translationKey)}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Award description */}
      <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-4">
        {tAwardDescriptions(currentAwardDef.translationKey)}
      </p>

      {/* Rankings — card list on mobile, table on sm+ */}

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {rankedList.map((member) => {
          const isWinner = member.rank === 1
          const isOneTrackMind = currentAwardDef.slug === 'one-track-mind'
          const oneTrackData = isOneTrackMind ? (member as UserOneTrackMindRanking & { rank: number }) : null
          return (
            <div
              key={member.userId}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isWinner
                  ? `${currentAwardDef.highlightBg} ${currentAwardDef.borderColor}`
                  : 'bg-[var(--surface-card)] border-[var(--border-subtle)]'
              }`}
            >
              <span className={`text-sm font-bold w-7 text-center flex-shrink-0 ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                #{member.rank}
              </span>
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-[var(--surface-base)]">
                <SafeImage
                  src={(member as any).image || ''}
                  alt={member.name}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="min-w-0 flex-1">
                {(member as any).lastfmUsername ? (
                  <Link
                    href={`/u/${encodeURIComponent((member as any).lastfmUsername)}`}
                    className={`text-sm font-medium block truncate ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {member.name}
                  </Link>
                ) : (
                  <span className={`text-sm font-medium block truncate ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {member.name}
                  </span>
                )}
                {isOneTrackMind && oneTrackData && oneTrackData.value > 0 && (
                  <div className="text-[11px] text-[var(--text-muted)] truncate">
                    {oneTrackData.entryArtist
                      ? `${oneTrackData.entryName} — ${oneTrackData.entryArtist}`
                      : oneTrackData.entryName || tAwards('noEntry')}
                  </div>
                )}
              </div>
              <span className={`text-sm font-medium flex-shrink-0 ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {currentAwardDef.formatValue(member.value, tAwards)}
              </span>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div
        className="hidden sm:block bg-[var(--surface-card)] rounded-lg shadow-lg overflow-hidden"
        style={{
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--surface-base)] sticky top-0 z-10">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-24 md:w-32">
                  {tAwards('rank')}
                </th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {tAwards('member')}
                </th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider w-32 md:w-48">
                  {tAwards('value')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rankedList.map((member) => {
                const isWinner = member.rank === 1
                const isOneTrackMind = currentAwardDef.slug === 'one-track-mind'
                const oneTrackData = isOneTrackMind ? (member as UserOneTrackMindRanking & { rank: number }) : null
                return (
                  <tr
                    key={member.userId}
                    className={`transition-colors ${isWinner ? currentAwardDef.highlightBg : 'hover:bg-[var(--surface-base)]'}`}
                  >
                    <td className="px-4 md:px-6 py-3 md:py-5 text-sm">
                      <span className={`font-bold ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                        #{member.rank}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--surface-base)]">
                          <SafeImage
                            src={(member as any).image || ''}
                            alt={member.name}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="min-w-0">
                          {(member as any).lastfmUsername ? (
                            <Link
                              href={`/u/${encodeURIComponent((member as any).lastfmUsername)}`}
                              className={`font-medium hover:text-[var(--theme-primary-dark)] transition-colors block truncate ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                            >
                              {member.name}
                            </Link>
                          ) : (
                            <span className={`font-medium block truncate ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                              {member.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-5 text-sm text-right">
                      <span className={`font-medium ${isWinner ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {currentAwardDef.formatValue(member.value, tAwards)}
                      </span>
                      {isOneTrackMind && oneTrackData && oneTrackData.value > 0 && (
                        <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[200px] md:max-w-none ml-auto">
                          {oneTrackData.entryArtist
                            ? `${oneTrackData.entryName} — ${oneTrackData.entryArtist}`
                            : oneTrackData.entryName || tAwards('noEntry')}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
