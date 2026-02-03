import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getGroupByIdForAccess } from '@/lib/group-queries'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RequestToJoinButton from './RequestToJoinButton'
import InviteNotification from './InviteNotification'
import CompatibilityScore from './CompatibilityScore'
import { getTranslations } from 'next-intl/server'
import { getArtistImage } from '@/lib/lastfm'

interface PublicGroupHeroServerProps {
  groupId: string
  colorTheme: string
  children?: React.ReactNode
}

export default async function PublicGroupHeroServer({ groupId, colorTheme, children }: PublicGroupHeroServerProps) {
  // Get user if authenticated to check membership
  const session = await getSession()
  let userId: string | null = null
  let isMember = false
  let hasPendingRequest = false
  let hasPendingInvite = false
  let pendingInviteId: string | null = null
  
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    userId = user?.id || null
    
    if (user) {
      // Check membership
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })
      isMember = !!membership
      
      // Check if user is creator (will be checked after we get the group)
      // Also check for pending request or invite
      const [pendingRequest, pendingInvite] = await Promise.all([
        prisma.groupJoinRequest.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        }),
        prisma.groupInvite.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        }),
      ])
      hasPendingRequest = pendingRequest?.status === 'pending'
      hasPendingInvite = pendingInvite?.status === 'pending'
      pendingInviteId = pendingInvite?.id || null
    }
  }
  
  // Use getGroupByIdForAccess to get the group (works for both public and private groups)
  const group = await getGroupByIdForAccess(groupId, userId)
  const t = await getTranslations('groups.hero')
  
  if (!group) {
    return null
  }

  // Check if user is creator (now that we have the group)
  if (userId && group.creatorId === userId) {
    isMember = true
  }

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Calculate tracking day info
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

  // Get chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string

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
          const { getArtistImage } = await import('@/lib/lastfm')
          // This will check uploaded images first, then fallback to MusicBrainz
          const dynamicImage = await getArtistImage(artistName, apiKey)
          if (dynamicImage) {
            groupImage = dynamicImage
          }
        }
      }
    } catch (error) {
      // If there's an error, fall back to stored image
      console.error('Error fetching dynamic artist image:', error)
    }
  }

  return (
    <div className={`relative ${themeClass}`}>
      {/* Full-width Banner with Blurred Background (same as member GroupHeroServer) */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 hero-background-mask">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 via-40% to-transparent" />
          <div className="absolute inset-0 bg-[var(--theme-primary)]/10" />
        </div>

        <div className="relative z-10">
          <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-12 xl:px-24 pt-4 md:pt-8 pb-4 md:pb-6">
            {/* Top Row: Breadcrumb + Action Buttons */}
            <div className="flex items-center justify-between mb-3 md:mb-6">
              <nav className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm">
                <Link href="/groups" className="text-white/70 hover:text-white transition-colors">
                  {t('breadcrumb')}
                </Link>
                <span className="text-white/40">/</span>
                <span className="text-white font-medium truncate max-w-[120px] md:max-w-none">{group.name}</span>
              </nav>
              <div className="flex items-center gap-1.5 md:gap-2">
                {session?.user?.email && !isMember && (
                  <>
                    <CompatibilityScore groupId={group.id} />
                    <RequestToJoinButton
                      groupId={group.id}
                      hasPendingRequest={hasPendingRequest}
                      hasPendingInvite={hasPendingInvite}
                      allowFreeJoin={group.allowFreeJoin ?? false}
                      memberCount={group._count.members}
                    />
                  </>
                )}
              </div>
            </div>

            {hasPendingInvite && pendingInviteId && (
              <div className="mb-3 md:mb-6">
                <InviteNotification groupId={group.id} inviteId={pendingInviteId} />
              </div>
            )}

            {/* Main Content - same layout as GroupHeroServer */}
            <div className="flex items-start md:items-end gap-3 md:gap-6">
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
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 text-white leading-[1.1] drop-shadow-lg break-words">
                  {group.name}
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3 mb-2 md:mb-4">
                  <div className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-[10px] md:text-sm text-white/90">
                    <span className="opacity-70">{t('owner')}</span>
                    <span className="font-semibold truncate max-w-[60px] md:max-w-[150px]">
                      {group.creator?.name || group.creator?.lastfmUsername || t('deletedUser')}
                    </span>
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
                {Array.isArray((group as any).tags) && (group as any).tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-4">
                    {(group as any).tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-sm font-medium bg-white/20 text-white border border-white/30 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {isMember && (
                  <Link
                    href={`/groups/${group.id}`}
                    className="inline-flex items-center gap-2 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 hover:bg-white/25 font-medium text-[10px] md:text-sm transition-colors"
                  >
                    <span>←</span>
                    <span>{t('public.viewAsMember')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Callout + Quick Stats inside hero (same slot as member page quick stats) */}
          {children && (
            <div className="max-w-6xl mx-auto px-3 md:px-6 lg:px-12 xl:px-24 pb-4 md:pb-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

