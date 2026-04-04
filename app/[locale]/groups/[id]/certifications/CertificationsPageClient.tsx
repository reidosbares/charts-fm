'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSpinner, faCertificate, faChevronDown, faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'
import { getEntryDrillDownPath, ChartType } from '@/lib/chart-slugs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const TIER_GRADIENT: Record<string, { from: string; to: string; glow: string }> = {
  gold: { from: '#FFD700', to: '#B8860B', glow: 'rgba(255,215,0,0.5)' },
  platinum: { from: '#E5E4E2', to: '#A8A8A0', glow: 'rgba(180,160,220,0.5)' },
  diamond: { from: '#B9F2FF', to: '#4FC3F7', glow: 'rgba(79,195,247,0.5)' },
}

const TIER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  gold: { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-500/10' },
  platinum: { border: 'border-gray-400', text: 'text-gray-500', bg: 'bg-gray-400/10' },
  diamond: { border: 'border-cyan-400', text: 'text-cyan-500', bg: 'bg-cyan-400/10' },
}

interface CertificationsPageClientProps {
  groupId: string
  isCreator: boolean
  currentUserId: string | null
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

function CarouselPlaque({ cert, entry, groupId, t }: {
  cert: { tier: string; awardedAt: string }
  entry: { name: string; artist: string; slug: string; chartType: string }
  groupId: string
  t: (key: string, values?: Record<string, any>) => string
}) {
  const imageUrl = useEntryImage(entry.artist, entry.name, entry.chartType)
  const gradient = TIER_GRADIENT[cert.tier] || TIER_GRADIENT.gold
  const date = new Date(cert.awardedAt).toLocaleDateString()

  return (
    <Link href={getEntryDrillDownPath(groupId, entry.chartType as ChartType, entry.slug)}>
      <div className="flex-shrink-0 w-[130px] md:w-[160px] text-center group cursor-pointer">
        <div
          className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] mx-auto rounded-full relative"
          style={{
            background: `conic-gradient(from 0deg, ${gradient.from}, ${gradient.to}, ${gradient.from})`,
            boxShadow: `0 0 20px ${gradient.glow}`,
          }}
        >
          <div className="absolute inset-[15%] rounded-full overflow-hidden bg-black/20">
            {imageUrl ? (
              <SafeImage src={imageUrl} alt={entry.name} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/30" />
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-black/40" />
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold truncate group-hover:underline">{entry.name}</p>
        <p className="text-[10px] text-gray-500 truncate">{entry.artist}</p>
        <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">{t(cert.tier)} · {date}</p>
      </div>
    </Link>
  )
}

const DISC_COLORS: Record<string, { fill: string; stroke: string; shine: string }> = {
  gold: { fill: '#D4A017', stroke: '#B8860B', shine: '#FFD700' },
  platinum: { fill: '#A8B4C0', stroke: '#8899AA', shine: '#D4DEE8' },
  diamond: { fill: '#7BD4F0', stroke: '#5BACC8', shine: '#B8EAFF' },
}

function MiniDisc({ tier }: { tier: string }) {
  const colors = DISC_COLORS[tier] || DISC_COLORS.gold
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" className="inline-block flex-shrink-0">
      <ellipse cx={7} cy={7} rx={6} ry={5} fill={colors.fill} stroke={colors.stroke} strokeWidth={0.8} />
      <circle cx={7} cy={7} r={1.5} fill={colors.stroke} opacity={0.6} />
      <ellipse cx={6} cy={5.5} rx={2.7} ry={1.5} fill={colors.shine} opacity={0.5} />
    </svg>
  )
}

function TierCounts({ awarded }: { awarded: any[] }) {
  const counts: Record<string, number> = { diamond: 0, platinum: 0, gold: 0 }
  for (const item of awarded) {
    const tier = item.certification.tier
    if (tier in counts) counts[tier]++
  }

  return (
    <span className="inline-flex items-center gap-2">
      {(['diamond', 'platinum', 'gold'] as const).map(tier => (
        <span key={tier} className="inline-flex items-center gap-0.5">
          <MiniDisc tier={tier} />
          <span className="text-xs text-gray-500">×{counts[tier]}</span>
        </span>
      ))}
    </span>
  )
}

function ArtistSection({ artist, groupId, canCertify, t, onAward }: {
  artist: {
    artistName: string; artistSlug: string; totalCertifications: number
    artistMajorDriverUserId?: string | null
    tracks: { awarded: any[]; eligible: any[] }
    albums: { awarded: any[]; eligible: any[] }
  }
  groupId: string; canCertify: boolean
  t: (key: string, values?: Record<string, any>) => string
  onAward: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const hasTracks = artist.tracks.awarded.length > 0 || artist.tracks.eligible.length > 0
  const hasAlbums = artist.albums.awarded.length > 0 || artist.albums.eligible.length > 0
  const eligibleCount = artist.tracks.eligible.length + artist.albums.eligible.length

  return (
    <div className="border border-white/40 rounded-2xl overflow-hidden bg-white/30 backdrop-blur-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/20 transition-colors text-left"
      >
        <FontAwesomeIcon
          icon={expanded ? faChevronDown : faChevronRight}
          className="text-gray-400 text-sm flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base truncate">{artist.artistName}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <TierCounts awarded={[...artist.tracks.awarded, ...artist.albums.awarded]} />
            {eligibleCount > 0 && (
              <span className="text-yellow-600 font-medium">
                · {t('eligibleCount', { count: eligibleCount })}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {hasTracks && (
            <SubSection
              label={t('tracks')}
              awarded={artist.tracks.awarded}
              eligible={artist.tracks.eligible}
              chartType="tracks"
              groupId={groupId}
              canCertify={canCertify}
              t={t}
              onAward={onAward}
            />
          )}
          {hasAlbums && (
            <SubSection
              label={t('albums')}
              awarded={artist.albums.awarded}
              eligible={artist.albums.eligible}
              chartType="albums"
              groupId={groupId}
              canCertify={canCertify}
              t={t}
              onAward={onAward}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SubSection({ label, awarded, eligible, chartType, groupId, canCertify, t, onAward }: {
  label: string; awarded: any[]; eligible: any[]; chartType: string
  groupId: string; canCertify: boolean
  t: (key: string, values?: Record<string, any>) => string
  onAward: () => void
}) {
  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</h4>
      <div className="flex gap-4 overflow-x-auto py-2 px-1">
        {awarded.map((item: any) => (
          <ArtistPlaque
            key={`${item.certification.id}`}
            name={item.entry.name}
            slug={item.entry.slug}
            entryKey={item.entry.entryKey}
            tier={item.certification.tier}
            awardedAt={item.certification.awardedAt}
            chartType={chartType}
            groupId={groupId}
            t={t}
          />
        ))}
        {eligible.map((item: any) => (
          <EligiblePlaque
            key={`${item.entryKey}-${item.tier}`}
            name={item.name}
            slug={item.slug}
            entryKey={item.entryKey}
            tier={item.tier}
            chartType={chartType}
            groupId={groupId}
            canCertify={canCertify}
            t={t}
            onAward={onAward}
          />
        ))}
      </div>
    </div>
  )
}

function ArtistPlaque({ name, slug, entryKey, tier, awardedAt, chartType, groupId, t }: {
  name: string; slug: string; entryKey: string; tier: string; awardedAt: string; chartType: string; groupId: string
  t: (key: string, values?: Record<string, any>) => string
}) {
  const parts = entryKey.split('|')
  const artist = parts[1] || ''
  const imageUrl = useEntryImage(artist, name, chartType)
  const gradient = TIER_GRADIENT[tier] || TIER_GRADIENT.gold

  return (
    <Link href={getEntryDrillDownPath(groupId, chartType as ChartType, slug)}>
      <div className="flex-shrink-0 w-[110px] md:w-[130px] text-center group cursor-pointer">
        <div
          className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] mx-auto rounded-full relative"
          style={{
            background: `conic-gradient(from 0deg, ${gradient.from}, ${gradient.to}, ${gradient.from})`,
            boxShadow: `0 0 15px ${gradient.glow}`,
          }}
        >
          <div className="absolute inset-[15%] rounded-full overflow-hidden bg-black/20">
            {imageUrl ? (
              <SafeImage src={imageUrl} alt={name} width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-black/30" />
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-black/40" />
          </div>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold truncate group-hover:underline">{name}</p>
        <p className="text-[10px] text-gray-400 uppercase font-bold">{t(tier)}</p>
        <p className="text-[9px] text-gray-400">{new Date(awardedAt).toLocaleDateString()}</p>
      </div>
    </Link>
  )
}

function EligiblePlaque({ name, slug, entryKey, tier, chartType, groupId, canCertify, t, onAward }: {
  name: string; slug: string; entryKey: string; tier: string; chartType: string
  groupId: string; canCertify: boolean
  t: (key: string, values?: Record<string, any>) => string
  onAward: () => void
}) {
  const [awarding, setAwarding] = useState(false)
  const gradient = TIER_GRADIENT[tier] || TIER_GRADIENT.gold

  const handleAward = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setAwarding(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType, entryKey, tier }),
      })
      if (res.ok) onAward()
    } finally {
      setAwarding(false)
    }
  }

  return (
    <div className="flex-shrink-0 w-[110px] md:w-[130px] text-center">
      <div
        className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] mx-auto rounded-full relative opacity-40"
        style={{
          border: `3px dashed ${gradient.from}`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <FontAwesomeIcon icon={faCertificate} className="text-2xl" style={{ color: gradient.from }} />
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-semibold truncate">{name}</p>
      {canCertify ? (
        <button
          onClick={handleAward}
          disabled={awarding}
          className="text-[10px] font-bold uppercase mt-0.5"
          style={{ color: gradient.from }}
        >
          {awarding ? '...' : t('eligible')}
        </button>
      ) : (
        <p className="text-[10px] font-bold uppercase mt-0.5" style={{ color: gradient.from }}>
          {t('eligible')}
        </p>
      )}
    </div>
  )
}

function AlmostThereRow({ entry, groupId, t }: {
  entry: { name: string; artist: string; slug: string; chartType: string; nextTier: string; percentage: number }
  groupId: string
  t: (key: string, values?: Record<string, any>) => string
}) {
  const imageUrl = useEntryImage(entry.artist, entry.name, entry.chartType)
  const tierColor = TIER_COLORS[entry.nextTier] || TIER_COLORS.gold
  const tierLabel = t(entry.nextTier)

  return (
    <Link href={getEntryDrillDownPath(groupId, entry.chartType as ChartType, entry.slug)}>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/30 hover:bg-white/60 transition-colors">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
          {imageUrl ? (
            <SafeImage src={imageUrl} alt={entry.name} width={40} height={40} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-200" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{entry.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 flex-shrink-0 uppercase font-medium">
              {entry.chartType === 'tracks' ? t('tracks') : t('albums')}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{entry.artist}</p>
        </div>
        <div className="flex-shrink-0 w-32 md:w-40">
          <div className="flex items-center gap-2">
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

export default function CertificationsPageClient({ groupId, isCreator, currentUserId }: CertificationsPageClientProps) {
  const t = useSafeTranslations('certificationsPage')
  const { data, error, isLoading, mutate } = useSWR(
    `/api/groups/${groupId}/certifications/overview`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-[var(--theme-primary)]" />
      </div>
    )
  }

  if (error || !data) {
    return null
  }

  const { recentAwards, byArtist, approaching } = data
  const hasAnyContent = recentAwards?.length > 0 || byArtist?.length > 0 || approaching?.length > 0

  if (!hasAnyContent) {
    return (
      <div className="text-center py-16">
        <FontAwesomeIcon icon={faCertificate} className="text-5xl text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium text-lg">{t('noCertifications')}</p>
        <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">{t('noCertificationsDescription')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {recentAwards?.length > 0 && (
        <section>
          <h2 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-4">
            {t('recentAwards')}
          </h2>
          <div className="flex gap-4 md:gap-6 overflow-x-auto py-4 px-1 -mx-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {recentAwards.slice(0, 10).map((award: any) => (
              <CarouselPlaque
                key={award.certification.id}
                cert={award.certification}
                entry={award.entry}
                groupId={groupId}
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      {byArtist?.length > 0 && (
        <section>
          <div className="space-y-3">
            {byArtist.map((artist: any) => (
              <ArtistSection
                key={artist.artistSlug}
                artist={artist}
                groupId={groupId}
                canCertify={isCreator || (!!currentUserId && artist.artistMajorDriverUserId === currentUserId)}
                t={t}
                onAward={() => mutate()}
              />
            ))}
          </div>
        </section>
      )}

      {approaching?.length > 0 && (
        <section>
          <h2 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-4">
            {t('almostThere')}
          </h2>
          <div className="space-y-2">
            {approaching.map((entry: any) => (
              <AlmostThereRow key={`${entry.chartType}-${entry.entryKey}`} entry={entry} groupId={groupId} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
