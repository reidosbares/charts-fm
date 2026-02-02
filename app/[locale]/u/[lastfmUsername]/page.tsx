import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import SafeImage from '@/components/SafeImage'
import { Link } from '@/i18n/routing'
import PersonalListeningOverview from '@/components/dashboard/PersonalListeningOverview'
import { getSession } from '@/lib/auth'
import { getGroupRecords } from '@/lib/group-records'
import { getPersonalizedMemberStats, getTotalVSForEntryInGroup } from '@/lib/member-group-stats'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faTrophy, faStar } from '@fortawesome/free-solid-svg-icons'
import HighlightedGroupFeaturedArtist from '@/components/profile/HighlightedGroupFeaturedArtist'

// Same award colors as RecordBlock on the records page
const AWARD_BADGE_CLASSES: Record<string, string> = {
  vsVirtuoso: 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300 text-slate-700',
  playPowerhouse: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-300 text-red-700',
  chartConnoisseur: 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300 text-yellow-700',
  hiddenGemHunter: 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-300 text-cyan-700',
  consistencyChampion: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-400 text-gray-800',
  tasteMaker: 'bg-gradient-to-br from-pink-50 to-fuchsia-50 border-pink-300 text-pink-700',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; lastfmUsername: string }>
}): Promise<Metadata> {
  const { locale, lastfmUsername } = await params
  const tSite = await getTranslations('site')

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`

  const username = decodeURIComponent(lastfmUsername)
  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: { name: true, lastfmUsername: true, profilePublic: true },
  })

  if (!user || !user.profilePublic) {
    return {
      title: tSite('name'),
      openGraph: { images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }] },
      twitter: { images: [defaultOgImage] },
    }
  }

  const title = `${user.name || user.lastfmUsername} (@${user.lastfmUsername})`
  const url = `${siteUrl}/${locale}/u/${encodeURIComponent(user.lastfmUsername)}`

  return {
    title,
    openGraph: {
      type: 'website',
      url,
      siteName: tSite('name'),
      title,
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      images: [defaultOgImage],
    },
  }
}

export default async function PublicUserProfilePage({
  params,
}: {
  params: Promise<{ locale: string; lastfmUsername: string }>
}) {
  const { lastfmUsername } = await params
  const t = await getTranslations('profilePublic')
  const tMyContribution = await getTranslations('records.myContribution')
  const tUserRecords = await getTranslations('records.userRecords')

  const username = decodeURIComponent(lastfmUsername).trim()
  if (!username) notFound()

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: {
      id: true,
      name: true,
      image: true,
      lastfmUsername: true,
      bio: true,
      profilePublic: true,
      showProfileStats: true,
      showProfileGroups: true,
      highlightedGroupId: true,
      highlightedGroupDriverArtistKey: true,
    },
  })

  if (!user || !user.profilePublic) notFound()

  const groups = user.showProfileGroups
    ? await prisma.group.findMany({
        where: { OR: [{ creatorId: user.id }, { members: { some: { userId: user.id } } }] },
        select: {
          id: true,
          name: true,
          image: true,
          isPrivate: true,
          creatorId: true,
          updatedAt: true,
          colorTheme: true,
        },
        orderBy: { updatedAt: 'desc' },
      })
    : []

  const session = await getSession()
  const viewerUserId = session?.user?.id || null
  const isSelf = viewerUserId === user.id

  // Hide private groups unless viewer can actually access them.
  const privateGroupIds = !isSelf && viewerUserId
    ? groups.filter((g) => g.isPrivate).map((g) => g.id)
    : []

  const viewerPrivateMemberships = privateGroupIds.length
    ? await prisma.groupMember.findMany({
        where: { userId: viewerUserId!, groupId: { in: privateGroupIds } },
        select: { groupId: true },
      })
    : []

  const viewerPrivateGroupIdSet = new Set(viewerPrivateMemberships.map((m) => m.groupId))

  const visibleGroups = groups.filter((g) => {
    if (!g.isPrivate) return true
    if (isSelf) return true
    if (!viewerUserId) return false
    if (g.creatorId === viewerUserId) return true
    return viewerPrivateGroupIdSet.has(g.id)
  })

  const highlightedGroup =
    user.highlightedGroupId && user.showProfileGroups
      ? visibleGroups.find((g) => g.id === user.highlightedGroupId) ?? null
      : null

  // Contribution summary and member awards for the profile user in their highlighted group
  const groupRecords = highlightedGroup ? await getGroupRecords(highlightedGroup.id) : null
  const recordsData =
    groupRecords?.status === 'completed' && groupRecords.records
      ? (groupRecords.records as Record<string, { userId?: string; name?: string; value?: number }>)
      : null
  const userAwardKeys: string[] = []
  if (recordsData && user.id) {
    const awardFieldToKey: Record<string, string> = {
      userMostVS: 'vsVirtuoso',
      userMostPlays: 'playPowerhouse',
      userMostEntries: 'chartConnoisseur',
      userLeastEntries: 'hiddenGemHunter',
      userMostWeeksContributing: 'consistencyChampion',
      userTasteMaker: 'tasteMaker',
    }
    for (const [field, key] of Object.entries(awardFieldToKey)) {
      if (recordsData[field]?.userId === user.id) userAwardKeys.push(key)
    }
  }
  const contributionStats =
    highlightedGroup && user.id
      ? await getPersonalizedMemberStats(highlightedGroup.id, user.id)
      : null

  const driverArtists =
    contributionStats?.driverEntries
      ?.filter((e) => e.chartType === 'artists')
      .map((e) => ({ entryKey: e.entryKey, name: e.name, slug: e.slug })) ?? []
  const featuredEntry =
    user.highlightedGroupDriverArtistKey && driverArtists.length > 0
      ? driverArtists.find((a) => a.entryKey === user.highlightedGroupDriverArtistKey) ?? null
      : null

  const featuredEntryVS =
    highlightedGroup && user.id && featuredEntry
      ? await getTotalVSForEntryInGroup(highlightedGroup.id, user.id, 'artists', featuredEntry.entryKey)
      : null

  const lastfmUrl = `https://www.last.fm/user/${encodeURIComponent(user.lastfmUsername)}`

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  } as const

  const themeClass = highlightedGroup
    ? `theme-${(highlightedGroup.colorTheme || 'white').toString().replace(/_/g, '-')}`
    : ''

  const otherGroups = highlightedGroup
    ? visibleGroups.filter((g) => g.id !== highlightedGroup.id)
    : visibleGroups

  return (
    <main className="flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 relative">
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
        {/* Sidebar: profile identity */}
        <aside className="lg:w-72 xl:w-80 flex-shrink-0">
          <div
            className="rounded-3xl p-6 border border-gray-200 shadow-lg sticky lg:top-8"
            style={glassStyle}
          >
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/60 shadow-lg flex-shrink-0">
                <SafeImage
                  src={user.image}
                  alt={user.name || user.lastfmUsername}
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 truncate w-full">
                {user.name || user.lastfmUsername}
              </h1>
              <p className="text-sm text-gray-600 font-semibold truncate w-full mt-0.5">@{user.lastfmUsername}</p>
              <a
                href={lastfmUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap text-sm w-full"
              >
                {t('viewOnLastfm')}
              </a>
              {user.bio ? (
                <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap text-left w-full">{user.bio}</p>
              ) : (
                <p className="mt-4 text-sm text-gray-500 w-full">{t('noBio')}</p>
              )}
            </div>
          </div>
        </aside>

        {/* Main: groups and listening stats */}
        <div className="flex-1 min-w-0 space-y-8">
          {user.showProfileGroups && (
            <section>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">{t('groupsTitle')}</h2>
              {highlightedGroup && (
                <section
                  className={`mb-6 rounded-3xl overflow-visible border-2 shadow-lg ${themeClass}`}
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-background-from), var(--theme-background-to))',
                    borderColor: 'var(--theme-border)',
                  }}
                >
                  <Link
                    href={`/groups/${highlightedGroup.id}`}
                    className="block p-6 md:p-8 hover:opacity-95 transition-opacity"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 shadow-md" style={{ borderColor: 'var(--theme-border)' }}>
                        <SafeImage
                          src={highlightedGroup.image}
                          alt={highlightedGroup.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--theme-primary-dark)' }}>
                          {highlightedGroup.name}
                        </h2>
                        <span
                          className="inline-block mt-2 px-4 py-2 rounded-xl font-bold text-sm"
                          style={{
                            backgroundColor: 'var(--theme-primary)',
                            color: 'var(--theme-button-text)',
                          }}
                        >
                          {t('viewGroup')}
                        </span>
                      </div>
                    </div>
                  </Link>
                  {(contributionStats || userAwardKeys.length > 0) && (
                    <div
                      className="px-6 md:px-8 pb-6 md:pb-8 pt-0"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      {contributionStats && (
                        <div className={userAwardKeys.length > 0 ? 'mb-5' : undefined}>
                          <div className="flex flex-wrap gap-4 md:gap-6 items-center">
                            <div className="flex flex-wrap gap-4 md:gap-6">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)' }}>
                                <FontAwesomeIcon icon={faChartLine} className="text-sm" style={{ color: 'var(--theme-button-text)' }} />
                              </div>
                              <div>
                                <p className="text-lg md:text-xl font-bold tabular-nums">
                                  {contributionStats.totalVS.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                </p>
                                <p className="text-xs opacity-90">{tMyContribution('totalVS')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20">
                                <FontAwesomeIcon icon={faTrophy} className="text-sm text-amber-600" />
                              </div>
                              <div>
                                <p className="text-lg md:text-xl font-bold tabular-nums">{contributionStats.weeksAsMVP}</p>
                                <p className="text-xs opacity-90">{tMyContribution('weeksAsMVP')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20">
                                <FontAwesomeIcon icon={faStar} className="text-sm text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-lg md:text-xl font-bold tabular-nums">
                                  {contributionStats.byChartType.artists.entriesAsMainDriver +
                                    contributionStats.byChartType.tracks.entriesAsMainDriver +
                                    contributionStats.byChartType.albums.entriesAsMainDriver}
                                </p>
                                <p className="text-xs opacity-90">{tMyContribution('entriesAsMainDriver')}</p>
                              </div>
                            </div>
                            </div>
                          </div>
                          {/* Featured artist - always below stats */}
                          {driverArtists.length > 0 && (featuredEntry || isSelf) && (
                            <div className="mt-4">
                              <HighlightedGroupFeaturedArtist
                                groupId={highlightedGroup.id}
                                featuredEntry={featuredEntry}
                                featuredEntryVS={featuredEntryVS ?? undefined}
                                driverArtists={driverArtists}
                                isSelf={!!isSelf}
                                currentEntryKey={user.highlightedGroupDriverArtistKey}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {userAwardKeys.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {userAwardKeys.map((key) => {
                            const cls = AWARD_BADGE_CLASSES[key] ?? 'bg-white/80 border-[var(--theme-border)] text-[var(--theme-text)]'
                            return (
                              <span
                                key={key}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${cls}`}
                              >
                                {tUserRecords(key)}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
              {otherGroups.length === 0 ? (
                <p className="text-sm text-gray-600">{t('noGroups')}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {otherGroups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/groups/${g.id}`}
                      className="rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                      style={glassStyle}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-white/60">
                          <SafeImage src={g.image} alt={g.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{g.name}</div>
                          {g.isPrivate && (
                            <div className="text-xs text-gray-500 font-medium">{t('privateGroupBadge')}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {user.showProfileStats && (
            <section>
              <PersonalListeningOverview username={user.lastfmUsername} />
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

