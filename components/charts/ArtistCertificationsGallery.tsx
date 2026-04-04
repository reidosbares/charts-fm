'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { Link } from '@/i18n/routing'
import { ArtistChartEntry } from '@/lib/chart-deep-dive'
import SafeImage from '@/components/SafeImage'

interface ArtistCertification {
  entryKey: string
  chartType: string
  tier: string
  awardedAt: string
}

interface ArtistCertificationsGalleryProps {
  certifications: ArtistCertification[]
  tracks: ArtistChartEntry[]
  albums: ArtistChartEntry[]
  groupId: string
}

const TIERS = [
  { key: 'gold', colors: { from: '#FFD700', to: '#B8860B', glow: 'rgba(255,215,0,0.5)', glowBright: 'rgba(255,215,0,0.8)', text: '#FFD700', plaque: '#3d3520', plaqueBorder: '#B8860B' } },
  { key: 'platinum', colors: { from: '#E5E4E2', to: '#A8A8A0', glow: 'rgba(180,160,220,0.5)', glowBright: 'rgba(180,160,220,0.85)', text: '#E5E4E2', plaque: '#2a2a2a', plaqueBorder: '#8E8D8A' } },
  { key: 'diamond', colors: { from: '#B9F2FF', to: '#4FC3F7', glow: 'rgba(79,195,247,0.5)', glowBright: 'rgba(79,195,247,0.8)', text: '#B9F2FF', plaque: '#1a2a30', plaqueBorder: '#4FC3F7' } },
] as const

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const

function getTierData(tier: string) {
  return TIERS.find(t => t.key === tier) || TIERS[0]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Image cache helpers (reuse same cache as DeepDiveClient)
const IMAGE_CACHE_PREFIX = 'chartsfm_image_cache_'

function getCacheKey(type: 'artist' | 'album', identifier: string): string {
  return `${IMAGE_CACHE_PREFIX}${type}_${identifier.toLowerCase().trim()}`
}

function getCachedImage(type: 'artist' | 'album', identifier: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const cacheKey = getCacheKey(type, identifier)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return undefined
    const data = JSON.parse(cached)
    const now = Date.now()
    const expiryTime = type === 'artist'
      ? data.timestamp + (1 * 60 * 60 * 1000)
      : data.timestamp + (30 * 24 * 60 * 60 * 1000)
    if (now > expiryTime) {
      localStorage.removeItem(cacheKey)
      return undefined
    }
    return data.url
  } catch {
    return undefined
  }
}

function setCachedImage(type: 'artist' | 'album', identifier: string, url: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const cacheKey = getCacheKey(type, identifier)
    localStorage.setItem(cacheKey, JSON.stringify({ url, timestamp: Date.now() }))
  } catch { /* ignore */ }
}

function useEntryImage(entry: ArtistChartEntry): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (entry.chartType === 'albums' && entry.artist) {
      const albumKey = `${entry.artist}|${entry.name}`
      const cached = getCachedImage('album', albumKey)
      if (cached !== undefined) {
        setImageUrl(cached)
        return
      }
      fetch(`/api/images/album?artist=${encodeURIComponent(entry.artist)}&album=${encodeURIComponent(entry.name)}`)
        .then(res => res.json())
        .then(result => {
          const url = result.imageUrl || null
          setImageUrl(url)
          setCachedImage('album', albumKey, url)
        })
        .catch(() => {
          setImageUrl(null)
          setCachedImage('album', albumKey, null)
        })
    } else if (entry.artist) {
      const cached = getCachedImage('artist', entry.artist)
      if (cached !== undefined) {
        setImageUrl(cached)
        return
      }
      fetch(`/api/images/artist?artist=${encodeURIComponent(entry.artist)}`)
        .then(res => res.json())
        .then(result => {
          const url = result.imageUrl || null
          setImageUrl(url)
          setCachedImage('artist', entry.artist!, url)
        })
        .catch(() => {
          setImageUrl(null)
          setCachedImage('artist', entry.artist!, null)
        })
    }
  }, [entry.chartType, entry.artist, entry.name])

  return imageUrl
}

/** A single plaque — identical to the one in CertificationsSection */
function GalleryPlaque({ cert, entry, groupId }: {
  cert: ArtistCertification
  entry: ArtistChartEntry
  groupId: string
}) {
  const t = useSafeTranslations('deepDive.certifications')
  const tierData = getTierData(cert.tier)
  const imageUrl = useEntryImage(entry)
  const href = `/groups/${groupId}/charts/${entry.chartType.slice(0, -1)}/${entry.slug}`

  return (
    <Link
      href={href}
      className="group flex-shrink-0 flex flex-col items-center w-[150px]"
    >
      {/* Frame / Plaque */}
      <div
        className={`relative w-full transition-all duration-300 shimmer-${cert.tier}`}
        style={{
          aspectRatio: '1',
          background: `linear-gradient(145deg, ${tierData.colors.plaque}, #0e0e0e)`,
          border: '2px solid transparent',
          borderRadius: '12px',
          boxShadow: undefined,
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          '--shimmer-from': tierData.colors.from,
          '--shimmer-to': tierData.colors.to,
          '--shimmer-glow': tierData.colors.glow,
          '--shimmer-glow-bright': tierData.colors.glowBright,
        } as React.CSSProperties}
      >
        {/* Disc with artwork */}
        <div
          className="relative rounded-full flex-shrink-0"
          style={{
            width: '70%',
            aspectRatio: '1',
            background: `conic-gradient(from 0deg, ${tierData.colors.from}, ${tierData.colors.to}, ${tierData.colors.from}, ${tierData.colors.to}, ${tierData.colors.from})`,
            boxShadow: `0 2px 12px ${tierData.colors.glow}`,
          }}
        >
          {/* Vinyl grooves effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `repeating-radial-gradient(circle at center, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)`,
            }}
          />
          {/* Center artwork circle */}
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              width: '52%',
              height: '52%',
              top: '24%',
              left: '24%',
              border: `2px solid ${tierData.colors.to}`,
              background: '#141414',
            }}
          >
            {imageUrl ? (
              <SafeImage
                src={imageUrl}
                alt={entry.name}
                className="object-cover w-full h-full"
                fill
                sizes="80px"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `radial-gradient(circle, ${tierData.colors.to}33, #141414)`,
                }}
              />
            )}
          </div>
          {/* Center spindle dot */}
          <div
            className="absolute rounded-full"
            style={{
              width: '8%',
              height: '8%',
              top: '46%',
              left: '46%',
              background: tierData.colors.to,
              boxShadow: `0 0 4px ${tierData.colors.glow}`,
            }}
          />
        </div>

        {/* Plaque text area */}
        <div
          className="w-full rounded-md py-1.5 px-2 text-center"
          style={{
            background: `linear-gradient(180deg, ${tierData.colors.from}22, ${tierData.colors.from}11)`,
            border: `1px solid ${tierData.colors.from}33`,
          }}
        >
          <div
            className="text-[10px] sm:text-xs font-bold tracking-widest"
            style={{ color: tierData.colors.text }}
          >
            {t(cert.tier)}
          </div>
          <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: tierData.colors.text, opacity: 0.5 }}>
            {formatDate(cert.awardedAt)}
          </div>
        </div>
      </div>

      {/* Entry name below plaque */}
      <div className="mt-1.5 text-xs text-center text-gray-700 group-hover:text-[var(--theme-primary-dark)] transition-colors line-clamp-2 w-full">
        {entry.name}
      </div>
    </Link>
  )
}

const ArtistCertificationsGallery = memo(function ArtistCertificationsGallery({
  certifications,
  tracks,
  albums,
  groupId,
}: ArtistCertificationsGalleryProps) {
  const t = useSafeTranslations('deepDive.certifications')

  // Build lookup for entry info
  const entryMap = useMemo(() => {
    const map = new Map<string, ArtistChartEntry>()
    for (const entry of [...tracks, ...albums]) {
      map.set(`${entry.entryKey}|${entry.chartType}`, entry)
    }
    return map
  }, [tracks, albums])

  // Create one plaque per certification, sorted by tier (highest first), then by entry name
  const plaques = useMemo(() => {
    return certifications
      .map(cert => {
        const entry = entryMap.get(`${cert.entryKey}|${cert.chartType}`)
        if (!entry) return null
        return { cert, entry }
      })
      .filter((p): p is { cert: ArtistCertification; entry: ArtistChartEntry } => p !== null)
      .sort((a, b) => {
        const aIdx = TIER_ORDER.indexOf(a.cert.tier as any)
        const bIdx = TIER_ORDER.indexOf(b.cert.tier as any)
        if (aIdx !== bIdx) return bIdx - aIdx
        return a.entry.name.localeCompare(b.entry.name)
      })
  }, [certifications, entryMap])

  if (plaques.length === 0) return null

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30 overflow-visible">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
        {t('title')}
      </h2>

      <div className="flex gap-4 sm:gap-5 md:gap-7 overflow-x-auto py-8 px-4 -my-8 -mx-4 scrollbar-hide">
        {plaques.map(({ cert, entry }) => (
          <GalleryPlaque
            key={`${cert.entryKey}|${cert.chartType}|${cert.tier}`}
            cert={cert}
            entry={entry}
            groupId={groupId}
          />
        ))}
      </div>

      {/* Shimmer animations */}
      <style jsx>{`
        @keyframes shimmer-glow {
          0%, 100% {
            border-color: var(--shimmer-to);
            box-shadow: 0 0 8px var(--shimmer-glow), 0 0 2px var(--shimmer-glow), inset 0 1px 0 rgba(255,255,255,0.05);
          }
          50% {
            border-color: var(--shimmer-from);
            box-shadow: 0 0 16px var(--shimmer-glow-bright), 0 0 40px var(--shimmer-glow), 0 0 60px var(--shimmer-glow), inset 0 1px 0 rgba(255,255,255,0.15);
          }
        }
        .shimmer-gold,
        .shimmer-platinum,
        .shimmer-diamond {
          animation: shimmer-glow 3s ease-in-out infinite !important;
        }
      `}</style>
    </div>
  )
})

export default ArtistCertificationsGallery
