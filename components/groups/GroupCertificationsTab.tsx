'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faCertificate } from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { getEntryDrillDownPath, ChartType } from '@/lib/chart-slugs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  gold: { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  platinum: { border: 'border-gray-400', text: 'text-gray-500', bg: 'bg-gray-400/10' },
  diamond: { border: 'border-cyan-400', text: 'text-cyan-500', bg: 'bg-cyan-400/10' },
}

interface GroupCertificationsTabProps {
  groupId: string
  isCreator: boolean
}

function useEntryImage(artist: string, name: string, chartType: string): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!artist && !name) return
    const cacheKey = chartType === 'albums'
      ? `cert-img-album-${artist}|${name}`
      : `cert-img-artist-${artist}`

    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { url, timestamp } = JSON.parse(cached)
        const maxAge = chartType === 'albums' ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000
        if (Date.now() - timestamp < maxAge) {
          setImageUrl(url)
          return
        }
      }
    } catch { /* ignore */ }

    const apiUrl = chartType === 'albums'
      ? `/api/images/album?artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(name)}`
      : `/api/images/artist?artist=${encodeURIComponent(artist)}`

    fetch(apiUrl)
      .then(res => res.json())
      .then(result => {
        const url = result.imageUrl || null
        setImageUrl(url)
        try { localStorage.setItem(cacheKey, JSON.stringify({ url, timestamp: Date.now() })) } catch { /* ignore */ }
      })
      .catch(() => setImageUrl(null))
  }, [artist, name, chartType])

  return imageUrl
}

function EntryThumbnail({ artist, name, chartType }: { artist: string; name: string; chartType: string }) {
  const imageUrl = useEntryImage(artist, name, chartType)
  return (
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
      {imageUrl ? (
        <SafeImage src={imageUrl} alt={name} width={48} height={48} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-200 flex items-center justify-center">
          <FontAwesomeIcon icon={faCertificate} className="text-gray-400 text-sm" />
        </div>
      )}
    </div>
  )
}

function EligibleCard({
  entry, groupId, isCreator, t, onAward,
}: {
  entry: { entryKey: string; chartType: string; name: string; artist: string; slug: string; tier: string; currentVS: number; threshold: number }
  groupId: string; isCreator: boolean
  t: (key: string, values?: Record<string, any>) => string
  onAward: () => void
}) {
  const [awarding, setAwarding] = useState(false)
  const tierColor = TIER_COLORS[entry.tier] || TIER_COLORS.gold
  const tierLabel = t(entry.tier)

  const handleAward = async () => {
    setAwarding(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType: entry.chartType, entryKey: entry.entryKey, tier: entry.tier }),
      })
      if (res.ok) onAward()
    } finally {
      setAwarding(false)
    }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border-2 ${tierColor.border} ${tierColor.bg}`}>
      <EntryThumbnail artist={entry.artist} name={entry.name} chartType={entry.chartType} />
      <div className="flex-1 min-w-0">
        <Link href={getEntryDrillDownPath(groupId, entry.chartType as ChartType, entry.slug)}>
          <p className="font-semibold text-sm truncate hover:underline">{entry.name}</p>
        </Link>
        <p className="text-xs text-gray-500 truncate">{entry.artist}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {t('vsOfThreshold', { current: entry.currentVS.toFixed(1), threshold: entry.threshold.toFixed(0) })}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        {isCreator ? (
          <button
            onClick={handleAward}
            disabled={awarding}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${
              entry.tier === 'gold' ? 'bg-yellow-500 hover:bg-yellow-600'
              : entry.tier === 'platinum' ? 'bg-gray-500 hover:bg-gray-600'
              : 'bg-cyan-500 hover:bg-cyan-600'
            } transition-colors disabled:opacity-50`}
          >
            {awarding ? '...' : `${t('award')} ${tierLabel}`}
          </button>
        ) : (
          <span className={`text-xs font-medium ${tierColor.text}`}>
            {t('eligibleFor', { tier: tierLabel })}
          </span>
        )}
      </div>
    </div>
  )
}

function RecentAwardCard({
  award, groupId, t,
}: {
  award: { certification: { tier: string; awardedAt: string; chartType: string }; entry: { name: string; artist: string; slug: string; chartType: string } }
  groupId: string
  t: (key: string, values?: Record<string, any>) => string
}) {
  const tierColor = TIER_COLORS[award.certification.tier] || TIER_COLORS.gold
  const tierLabel = t(award.certification.tier)
  const awardDate = new Date(award.certification.awardedAt).toLocaleDateString()

  return (
    <Link href={getEntryDrillDownPath(groupId, award.entry.chartType as ChartType, award.entry.slug)}>
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/40 hover:bg-white/80 transition-colors">
        <EntryThumbnail artist={award.entry.artist} name={award.entry.name} chartType={award.entry.chartType} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{award.entry.name}</p>
          <p className="text-xs text-gray-500 truncate">{award.entry.artist}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${tierColor.bg} ${tierColor.text} border ${tierColor.border}`}>
            {tierLabel}
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5">{t('awardedOn', { date: awardDate })}</p>
        </div>
      </div>
    </Link>
  )
}

function ApproachingCard({
  entry, groupId, t,
}: {
  entry: { name: string; artist: string; slug: string; chartType: string; nextTier: string; percentage: number }
  groupId: string
  t: (key: string, values?: Record<string, any>) => string
}) {
  const tierColor = TIER_COLORS[entry.nextTier] || TIER_COLORS.gold
  const tierLabel = t(entry.nextTier)

  return (
    <Link href={getEntryDrillDownPath(groupId, entry.chartType as ChartType, entry.slug)}>
      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/30 hover:bg-white/60 transition-colors">
        <EntryThumbnail artist={entry.artist} name={entry.name} chartType={entry.chartType} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{entry.name}</p>
          <p className="text-xs text-gray-500 truncate">{entry.artist}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  entry.nextTier === 'gold' ? 'bg-yellow-500'
                  : entry.nextTier === 'platinum' ? 'bg-gray-400'
                  : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(entry.percentage, 100)}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium ${tierColor.text} whitespace-nowrap`}>
              {t('percentToTier', { percent: entry.percentage.toFixed(0), tier: tierLabel })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}


export default function GroupCertificationsTab({ groupId, isCreator }: GroupCertificationsTabProps) {
  const t = useSafeTranslations('certificationsTab')
  const { data, error, isLoading, mutate } = useSWR(
    `/api/groups/${groupId}/certifications/overview`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const { recentAwards, eligible, approaching } = data
  const hasContent = recentAwards?.length > 0 || eligible?.length > 0 || approaching?.length > 0

  if (!hasContent) {
    return (
      <div className="text-center py-12 px-4">
        <FontAwesomeIcon icon={faCertificate} className="text-4xl text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">{t('empty')}</p>
        <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">{t('emptyDescription')}</p>
      </div>
    )
  }

  const displayEligible = eligible?.slice(0, 5) || []
  const displayRecent = recentAwards?.slice(0, 5) || []
  const displayApproaching = approaching?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      {/* Header with View All link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 md:mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-[var(--theme-primary-dark)]">
          {t('title')}
        </h2>
        <LiquidGlassLink href={`/groups/${groupId}/certifications`} variant="primary" useTheme>
          {t('viewAll')}
        </LiquidGlassLink>
      </div>

      {displayEligible.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-[var(--theme-primary-dark)] uppercase tracking-wide mb-3">
            {t('readyToAward')}
          </h3>
          <div className="space-y-3">
            {displayEligible.map((entry: any) => (
              <EligibleCard
                key={`${entry.chartType}-${entry.entryKey}-${entry.tier}`}
                entry={entry}
                groupId={groupId}
                isCreator={isCreator}
                t={t}
                onAward={() => mutate()}
              />
            ))}
          </div>
        </section>
      )}

      {displayRecent.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-[var(--theme-primary-dark)] uppercase tracking-wide mb-3">
            {t('recentlyAwarded')}
          </h3>
          <div className="flex flex-col gap-4">
            {displayRecent.map((award: any) => (
              <RecentAwardCard
                key={award.certification.id}
                award={award}
                groupId={groupId}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      {displayApproaching.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-[var(--theme-primary-dark)] uppercase tracking-wide mb-3">
            {t('almostThere')}
          </h3>
          <div className="flex flex-col gap-4">
            {displayApproaching.map((entry: any) => (
              <ApproachingCard
                key={`${entry.chartType}-${entry.entryKey}-${entry.nextTier}`}
                entry={entry}
                groupId={groupId}
                t={t}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
