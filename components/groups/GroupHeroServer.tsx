import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import { getLastChartWeek, canUpdateCharts as canUpdateChartsHelper } from '@/lib/group-service'
import UpdateChartsButton from './UpdateChartsButton'
import SoloChartsEmptyOverlay from './SoloChartsEmptyOverlay'
import ShareGroupButton from '@/app/[locale]/groups/[id]/ShareGroupButton'
import QuickAccessButton from '@/app/[locale]/groups/[id]/QuickAccessButton'
import RequestToJoinButton from '@/app/[locale]/groups/[id]/public/RequestToJoinButton'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { getArtistImage } from '@/lib/lastfm'
import HeroSearchBar from '@/app/[locale]/groups/[id]/HeroSearchBar'

interface GroupHeroServerProps {
  groupId: string
  isOwner: boolean
  colorTheme: string
  isMember?: boolean
  userId?: string | null
  children?: React.ReactNode
}

export default async function GroupHeroServer({ groupId, isOwner, colorTheme, isMember = true, userId, children }: GroupHeroServerProps) {
  const t = await getTranslations('groups.hero')

  // Get group data
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!group) {
    return null
  }

  // Get caption from stored data (set when icon is updated)
  const imageCaption = group.dynamicIconCaption || null

  // If dynamic icon is enabled for artists, check for user-chosen images dynamically
  let groupImage = group.image
  if (group.dynamicIconEnabled && (group.dynamicIconSource === 'top_artist' || group.dynamicIconSource === 'top_track_artist')) {
    try {
      // Get latest weekly stats to find current top artist
      const latestStats = await prisma.groupWeeklyStats.findFirst({
        where: { groupId: group.id },
        orderBy: { weekStart: 'desc' },
      })

      if (latestStats) {
        let artistName: string | null = null
        
        if (group.dynamicIconSource === 'top_artist') {
          const topArtists = latestStats.topArtists as unknown as Array<{ name: string }>
          if (topArtists && topArtists.length > 0) {
            artistName = topArtists[0].name
          }
        } else if (group.dynamicIconSource === 'top_track_artist') {
          const topTracks = latestStats.topTracks as unknown as Array<{ artist: string }>
          if (topTracks && topTracks.length > 0 && topTracks[0].artist) {
            artistName = topTracks[0].artist
          }
        }

        // If we have an artist name, check for user-chosen image
        if (artistName) {
          const apiKey = process.env.LASTFM_API_KEY || ''
          // This will check uploaded images first, then fallback to MusicBrainz
          const dynamicImage = await getArtistImage(artistName, apiKey)
          console.log(`[GroupHeroServer] Group ${group.id}, Artist: ${artistName}, Stored: ${group.image}, Dynamic: ${dynamicImage}`)
          if (dynamicImage) {
            groupImage = dynamicImage
          }
        } else {
          console.log(`[GroupHeroServer] Group ${group.id}, No artist name found`)
        }
      } else {
        console.log(`[GroupHeroServer] Group ${group.id}, No latest stats found`)
      }
    } catch (error) {
      // If there's an error, fall back to stored image
      console.error(`[GroupHeroServer] Error fetching dynamic artist image for group ${group.id}:`, error)
    }
  } else {
    console.log(`[GroupHeroServer] Group ${group.id}, Dynamic icon not enabled or not artist-based (enabled: ${group.dynamicIconEnabled}, source: ${group.dynamicIconSource})`)
  }

  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const dayNames = [
    t('daysOfWeek.sunday'),
    t('daysOfWeek.monday'),
    t('daysOfWeek.tuesday'),
    t('daysOfWeek.wednesday'),
    t('daysOfWeek.thursday'),
    t('daysOfWeek.friday'),
    t('daysOfWeek.saturday')
  ]
  const trackingDayName = dayNames[trackingDayOfWeek]
  
  const now = new Date()
  const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
  const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
  const nextChartDate = currentWeekEnd
  const nextChartDateFormatted = formatWeekLabel(nextChartDate)
  const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Check if charts can be updated
  const lastChartWeek = await getLastChartWeek(groupId)
  const chartGenerationInProgress = group.chartGenerationInProgress || false
  const hasCharts = !!lastChartWeek
  const isSolo = Boolean((group as any).isSolo)
  
  // Charts can be updated if it's at least the next day of the week since the last chart was generated
  // and generation is not already in progress
  let canUpdateCharts = canUpdateChartsHelper(lastChartWeek, trackingDayOfWeek, now) && !chartGenerationInProgress

  // Check for pending request/invite for non-members
  let hasPendingRequest = false
  let hasPendingInvite = false
  if (!isMember && userId) {
    const pendingRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })
    hasPendingRequest = pendingRequest?.status === 'pending'

    const pendingInvite = await prisma.groupInvite.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })
    hasPendingInvite = pendingInvite?.status === 'pending'
  }

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  return (
    <div className={`relative ${themeClass}`}>
      {/* Full-width Banner with Blurred Background */}
      <div className="relative overflow-hidden">
        {/* Blurred Background Image - fades out at bottom (earlier fade on mobile due to taller stacked content) */}
        <div 
          className="absolute inset-0 hero-background-mask"
        >
          {groupImage ? (
            <div 
              className="absolute inset-0 scale-110 blur-2xl opacity-90"
              style={{
                backgroundImage: `url(${groupImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)]" />
          )}
          {/* Gradient Overlay - darker at top for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 via-40% to-transparent" />
          {/* Theme tint overlay */}
          <div className="absolute inset-0 bg-[var(--theme-primary)]/10" />
        </div>

        {/* Content Container */}
        <div className="relative z-10">
          {/* Main Hero Content */}
          <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-12 xl:px-24 pt-4 md:pt-8 pb-4 md:pb-6">
            {isMember && (
              <SoloChartsEmptyOverlay
                groupId={groupId}
                enabled={isSolo && !hasCharts && canUpdateCharts && !chartGenerationInProgress}
              />
            )}
            
            {/* Top Row: Breadcrumb + Action Buttons */}
            <div className="flex items-center justify-between mb-3 md:mb-6">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                <Link 
                  href="/groups" 
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {t('breadcrumb')}
                </Link>
                <span className="text-white/40">/</span>
                <span className="text-white font-medium truncate max-w-[120px] md:max-w-none">{group.name}</span>
              </nav>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 md:gap-2">
                {isMember && <QuickAccessButton groupId={groupId} />}
                {isOwner && (
                  <LiquidGlassLink
                    href={`/groups/${groupId}/settings`}
                    variant="secondary"
                    size="sm"
                    className="text-[10px] md:text-sm !bg-white/20 !text-white hover:!bg-white/30 !border-white/30 !px-1.5 !py-1 md:!px-3 md:!py-2"
                  >
                    {t('settings')}
                  </LiquidGlassLink>
                )}
                {!isMember && userId && (
                  <RequestToJoinButton
                    groupId={groupId}
                    hasPendingRequest={hasPendingRequest}
                    hasPendingInvite={hasPendingInvite}
                    allowFreeJoin={group.allowFreeJoin ?? false}
                    memberCount={group._count.members}
                  />
                )}
                {isMember && <ShareGroupButton groupId={groupId} />}
              </div>
            </div>
            
            {/* Main Content - horizontal on mobile too */}
            <div className="flex items-start md:items-end gap-3 md:gap-6">
              {/* Group Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-36 md:h-36 lg:w-44 lg:h-44 rounded-lg md:rounded-2xl overflow-hidden shadow-2xl ring-2 md:ring-4 ring-white/30 bg-black/20">
                  <SafeImage
                    key={groupImage}
                    src={groupImage}
                    alt={group.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                {imageCaption && (
                  <p className="text-[10px] md:text-xs italic text-white/70 mt-1 md:mt-2 text-left max-w-[5rem] md:max-w-[9rem]">
                    {imageCaption}
                  </p>
                )}
              </div>
              
              {/* Group Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 text-white leading-[1.1] drop-shadow-lg break-words">
                  {group.name}
                </h1>
                
                {/* Metadata - compact on mobile */}
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mb-2 md:mb-4">
                  <div className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] md:text-sm text-white/90">
                    <span className="opacity-70">{t('owner')}</span>
                    {group.creator?.lastfmUsername ? (
                      <Link
                        href={`/u/${encodeURIComponent(group.creator.lastfmUsername)}`}
                        className="font-semibold hover:underline truncate max-w-[60px] md:max-w-[150px]"
                        title={group.creator.name || group.creator.lastfmUsername}
                      >
                        {group.creator.name || group.creator.lastfmUsername}
                      </Link>
                    ) : (
                      <span className="font-semibold truncate max-w-[60px] md:max-w-[150px]">
                        {group.creator ? (group.creator.name || group.creator.lastfmUsername) : t('deletedUser')}
                      </span>
                    )}
                  </div>
                  <div className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] md:text-sm text-white/90">
                    <span className="font-semibold">{group._count.members}</span>
                    <span className="opacity-70">{t('members')}</span>
                  </div>
                  <div className="hidden sm:inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] md:text-sm text-white/90">
                    <span className="opacity-70">{t('tracking')}</span>
                    <span className="font-semibold">{trackingDayName}</span>
                  </div>
                </div>
                
                {/* Next Charts Badge or Update Button */}
                {isMember && (
                  <div className="flex-shrink-0">
                    {canUpdateCharts || chartGenerationInProgress ? (
                      <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} />
                    ) : (
                      <div className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-4 md:py-2 rounded-full font-semibold text-[10px] md:text-sm bg-[var(--theme-primary)] text-[var(--theme-button-text)] shadow-lg">
                        <span>{t(daysUntilNextChart === 1 ? 'nextChartsIn' : 'nextChartsInDays', { count: daysUntilNextChart })}</span>
                        <span className="text-[10px] md:text-xs opacity-80 hidden sm:inline">({nextChartDateFormatted})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Area - inside the hero with faded background */}
          {children && (
            <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-12 xl:px-24 pb-4 md:pb-6">
              {children}
            </div>
          )}

          {/* Search Bar - inside the hero, below quick stats */}
          {isMember && (
            <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-12 xl:px-24 pb-6 md:pb-8">
              <HeroSearchBar groupId={groupId} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

