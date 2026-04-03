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
    borderColor: 'border-amber-300',
    activeTabBg: 'bg-amber-100',
    activeTabText: 'text-amber-800',
    activeTabBorder: 'border-amber-400',
    highlightBg: 'bg-amber-50',
    ribbonColor: 'bg-amber-500',
  },
  {
    slug: 'play-powerhouse',
    translationKey: 'playPowerhouse',
    dataKey: 'userMostPlaysRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('plays')}`,
    bgGradient: 'from-red-50 to-rose-50',
    borderColor: 'border-red-300',
    activeTabBg: 'bg-red-100',
    activeTabText: 'text-red-800',
    activeTabBorder: 'border-red-400',
    highlightBg: 'bg-red-50',
    ribbonColor: 'bg-red-500',
  },
  {
    slug: 'chart-connoisseur',
    translationKey: 'chartConnoisseur',
    dataKey: 'userMostEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-sky-50 to-blue-50',
    borderColor: 'border-sky-300',
    activeTabBg: 'bg-sky-100',
    activeTabText: 'text-sky-800',
    activeTabBorder: 'border-sky-400',
    highlightBg: 'bg-sky-50',
    ribbonColor: 'bg-sky-500',
  },
  {
    slug: 'hidden-gem-hunter',
    translationKey: 'hiddenGemHunter',
    dataKey: 'userLeastEntriesRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-teal-50 to-cyan-50',
    borderColor: 'border-teal-300',
    activeTabBg: 'bg-teal-100',
    activeTabText: 'text-teal-800',
    activeTabBorder: 'border-teal-400',
    highlightBg: 'bg-teal-50',
    ribbonColor: 'bg-teal-500',
  },
  {
    slug: 'one-track-mind',
    translationKey: 'oneTrackMind',
    dataKey: 'userOneTrackMindRankings',
    formatValue: (v: number, t: any) => `${v.toLocaleString()} ${t('vs')}`,
    bgGradient: 'from-violet-50 to-purple-50',
    borderColor: 'border-violet-300',
    activeTabBg: 'bg-violet-100',
    activeTabText: 'text-violet-800',
    activeTabBorder: 'border-violet-400',
    highlightBg: 'bg-violet-50',
    ribbonColor: 'bg-violet-500',
  },
  {
    slug: 'taste-maker',
    translationKey: 'tasteMaker',
    dataKey: 'userTasteMakerRankings',
    formatValue: (v: number, t: any) => `${v} ${v === 1 ? t('entry') : t('entries')}`,
    bgGradient: 'from-pink-50 to-fuchsia-50',
    borderColor: 'border-pink-300',
    activeTabBg: 'bg-pink-100',
    activeTabText: 'text-pink-800',
    activeTabBorder: 'border-pink-400',
    highlightBg: 'bg-pink-50',
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
        <p className="text-sm md:text-base text-gray-600">{tStatus('noRecordsForCategory')}</p>
      </div>
    )
  }

  const recordsData = records.records as any
  const currentAwardDef = AWARDS.find(a => a.slug === activeAward) || AWARDS[0]
  const rankings = (recordsData[currentAwardDef.dataKey] || []) as (UserRanking | UserOneTrackMindRanking)[]
  const rankedList = assignRanks(rankings)

  return (
    <div className="mt-6">
      {/* Tab selector */}
      <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {AWARDS.map((award) => {
            const isActive = activeAward === award.slug
            return (
              <button
                key={award.slug}
                onClick={() => handleTabChange(award.slug)}
                className={`px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? `${award.activeTabBg} ${award.activeTabText} ${award.activeTabBorder}`
                    : 'bg-white/80 text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tUserRecords(award.translationKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Award description */}
      <p className="text-sm text-gray-500 mb-4">
        {tAwardDescriptions(currentAwardDef.translationKey)}
      </p>

      {/* Rankings table */}
      <div
        className="bg-white rounded-lg shadow-lg overflow-hidden mx-2 md:mx-0"
        style={{
          backgroundColor: '#ffffff',
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12 sm:w-24 md:w-32">
                  {tAwards('rank')}
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {tAwards('member')}
                </th>
                <th className="px-2 sm:px-4 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-24 sm:w-32 md:w-48">
                  {tAwards('value')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rankedList.map((member) => {
                const isWinner = member.rank === 1
                const isOneTrackMind = currentAwardDef.slug === 'one-track-mind'
                const oneTrackData = isOneTrackMind ? (member as UserOneTrackMindRanking & { rank: number }) : null
                return (
                  <tr
                    key={member.userId}
                    className={`transition-colors ${isWinner ? currentAwardDef.highlightBg : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <span className={`font-bold ${isWinner ? 'text-gray-900' : 'text-gray-500'}`}>
                        #{member.rank}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
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
                              className={`font-medium hover:text-[var(--theme-primary-dark)] transition-colors block truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}
                            >
                              {member.name}
                            </Link>
                          ) : (
                            <span className={`font-medium block truncate ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}>
                              {member.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 md:px-6 py-3 md:py-5 text-sm text-right">
                      <span className={`font-medium ${isWinner ? 'text-gray-900' : 'text-gray-600'}`}>
                        {currentAwardDef.formatValue(member.value, tAwards)}
                      </span>
                      {isOneTrackMind && oneTrackData && oneTrackData.value > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px] sm:max-w-[200px] md:max-w-none ml-auto">
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
