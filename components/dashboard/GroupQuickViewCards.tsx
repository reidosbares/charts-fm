'use client'

import { useMemo, memo } from 'react'
import useSWR from 'swr'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCrown, faUsers, faSpinner, faPlus, faEnvelope, faHandPaper } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface GroupQuickView {
  id: string
  name: string
  image: string | null
  colorTheme: string
  isOwner: boolean
  latestWeek: {
    weekStart: string
    topArtist: { name: string; playcount: number } | null
    topTrack: { name: string; artist: string; playcount: number } | null
  } | null
  userContributions: {
    tracksInChart: number
    topContribution: { name: string; position: number; chartType: string } | null
  }
  daysUntilNextChart: number
  memberCount: number
  chartMode: string
  canUpdateCharts: boolean
}

// Memoized group card component to prevent unnecessary re-renders
const GroupCard = memo(({ group, t }: { group: GroupQuickView; t: any }) => {
  const themeClass = `theme-${group.colorTheme.replace('_', '-')}`
  const groupImage = useMemo(() => group.image || getDefaultGroupImage(), [group.image])

  return (
    <Link
      href={`/groups/${group.id}`}
      className={`block bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-3 md:p-4 border border-[var(--theme-border)] hover:shadow-md transition-all ${themeClass}`}
    >
      <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
        <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-lg overflow-hidden ring-1 ring-black/10 dark:ring-white/10 shadow-sm bg-[var(--theme-primary-lighter)]">
          <SafeImage
            src={groupImage}
            alt={group.name}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[var(--theme-text)] truncate">{group.name}</h3>
            {group.isOwner && (
              <FontAwesomeIcon icon={faCrown} className="text-[var(--theme-primary)] text-xs" title={t('owner')} />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <FontAwesomeIcon icon={faUsers} className="text-xs" />
            <span>{group.memberCount} {group.memberCount === 1 ? t('member') : t('members')}</span>
          </div>
        </div>
      </div>

      {group.latestWeek ? (
        <div className="space-y-2 mb-3">
          {group.latestWeek.topArtist && (
            <div 
              className="flex items-center gap-2 text-sm rounded-lg p-2"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              }}
            >
              <FontAwesomeIcon icon={faMicrophone} className="text-[var(--theme-primary)] text-xs" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--text-primary)] truncate">{group.latestWeek.topArtist.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{t('plays', { count: group.latestWeek.topArtist.playcount })}</div>
              </div>
            </div>
          )}
          {group.latestWeek.topTrack && (
            <div 
              className="flex items-center gap-2 text-sm rounded-lg p-2"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              }}
            >
              <FontAwesomeIcon icon={faMusic} className="text-[var(--theme-primary)] text-xs" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[var(--text-primary)] truncate">{group.latestWeek.topTrack.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{t('by', { artist: group.latestWeek.topTrack.artist })}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-muted)] mb-3 italic">{t('noCharts')}</div>
      )}

      {group.userContributions.tracksInChart > 0 && (
        <div className="text-xs text-[var(--text-secondary)] mb-2">
          <span className="font-medium">{t('youContributed', { count: group.userContributions.tracksInChart })}</span>
          {group.userContributions.topContribution && (
            <span className="text-[var(--text-muted)]">
              {' '}• #{group.userContributions.topContribution.position} {group.userContributions.topContribution.name}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--theme-border-rgb)/0.5)]">
        <span className="text-xs text-[var(--text-muted)]">
          {group.daysUntilNextChart === 0
            ? t('chartsUpdateToday')
            : group.daysUntilNextChart === 1
            ? t('nextChartTomorrow')
            : t('daysUntilNextChart', { count: group.daysUntilNextChart })}
        </span>
        <span className="text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-1 rounded font-medium">
          {group.chartMode === 'vs' ? t('chartMode.vs') : group.chartMode === 'vs_weighted' ? t('chartMode.vsWeighted') : t('chartMode.plays')}
        </span>
      </div>
    </Link>
  )
})
GroupCard.displayName = 'GroupCard'

interface QuickActionsData {
  pendingInvitesCount: number
  pendingRequestsCount: number
}

export default function GroupQuickViewCards() {
  const t = useSafeTranslations('dashboard.groupQuickView')
  const tQuick = useSafeTranslations('dashboard.quickActions')
  const { data: groups, error, isLoading } = useSWR<GroupQuickView[]>('/api/dashboard/groups')
  const { data: quickActions } = useSWR<QuickActionsData>('/api/dashboard/quick-actions')

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  }

  if (isLoading) {
    return (
      <div
        className="rounded-xl shadow-lg p-4 md:p-6 border border-[var(--border-subtle)]"
        style={glassStyle}
      >
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-[var(--text-primary)]">{t('title')}</h2>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || !groups || groups.length === 0) {
    const pendingInvites = quickActions?.pendingInvitesCount ?? 0
    const pendingRequests = quickActions?.pendingRequestsCount ?? 0
    const hasNotificationBanners = pendingInvites > 0 || pendingRequests > 0

    return (
      <div
        className="rounded-xl shadow-lg p-4 md:p-6 border border-[var(--border-subtle)]"
        style={glassStyle}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--theme-primary-dark)]">{t('title')}</h2>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold text-sm w-fit"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            {t('createGroup')}
          </Link>
        </div>

        {hasNotificationBanners && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {pendingInvites > 0 && (
              <Link
                href="/groups"
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center relative bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 flex-shrink-0">
                  <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {pendingInvites}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] text-sm">{tQuick('pendingInvites')}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {pendingInvites} {pendingInvites === 1 ? tQuick('invite') : tQuick('invites')}
                  </div>
                </div>
              </Link>
            )}
            {pendingRequests > 0 && (
              <Link
                href="/groups"
                className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.5)',
                  backdropFilter: 'blur(8px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center relative bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex-shrink-0">
                  <FontAwesomeIcon icon={faHandPaper} className="text-sm" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {pendingRequests}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--text-primary)] text-sm">{tQuick('joinRequests')}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {pendingRequests} {pendingRequests === 1 ? tQuick('request') : tQuick('requests')}
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}

        <div className="text-center py-8 text-[var(--text-muted)]">
          <p className="mb-4">{t('noGroups')}</p>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            {t('createFirstGroup')}
          </Link>
        </div>
      </div>
    )
  }

  const pendingInvites = quickActions?.pendingInvitesCount ?? 0
  const pendingRequests = quickActions?.pendingRequestsCount ?? 0
  const hasNotificationBanners = pendingInvites > 0 || pendingRequests > 0

  return (
    <div 
      className="rounded-xl shadow-lg p-4 md:p-6 border border-theme"
      style={glassStyle}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{t('title')}</h2>
          {groups.some(group => group.canUpdateCharts) && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{t('chartsCanBeUpdated')}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors font-semibold text-sm"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            {t('createGroup')}
          </Link>
          <Link
            href="/groups"
            className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-base)] transition-colors font-semibold text-sm"
          >
            {t('viewAll')}
          </Link>
        </div>
      </div>

      {hasNotificationBanners && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {pendingInvites > 0 && (
            <Link
              href="/groups"
              className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center relative bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 flex-shrink-0">
                <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {pendingInvites}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{tQuick('pendingInvites')}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {pendingInvites} {pendingInvites === 1 ? tQuick('invite') : tQuick('invites')}
                </div>
              </div>
            </Link>
          )}
          {pendingRequests > 0 && (
            <Link
              href="/groups"
              className="flex items-center gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center relative bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex-shrink-0">
                <FontAwesomeIcon icon={faHandPaper} className="text-sm" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {pendingRequests}
                </span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[var(--text-primary)] text-sm">{tQuick('joinRequests')}</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {pendingRequests} {pendingRequests === 1 ? tQuick('request') : tQuick('requests')}
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} t={t} />
        ))}
      </div>
    </div>
  )
}

