'use client'

import { useState, memo } from 'react'
import { ArtistChartEntry } from '@/lib/chart-deep-dive'
import LiquidGlassTabs from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { faMusic, faCompactDisc } from '@fortawesome/free-solid-svg-icons'

interface ArtistCertification {
  entryKey: string
  chartType: string
  tier: string
  awardedAt: string
}

interface ArtistEntriesTableProps {
  tracks: ArtistChartEntry[]
  albums: ArtistChartEntry[]
  groupId: string
  certifications?: ArtistCertification[] | null
}

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const

const TIER_COLORS: Record<string, { fill: string; stroke: string; shine: string }> = {
  gold: { fill: '#D4A017', stroke: '#B8860B', shine: '#FFD700' },
  platinum: { fill: '#A8B4C0', stroke: '#8899AA', shine: '#D4DEE8' },
  diamond: { fill: '#7BD4F0', stroke: '#5BACC8', shine: '#B8EAFF' },
}

function CertificationDiscs({ tiers, label }: { tiers: string[]; label: string }) {
  const count = tiers.length
  // Each disc is an ellipse; stacked horizontally with slight overlap
  const discW = 12
  const discH = 10
  const overlap = 4
  const totalW = discW + (count - 1) * (discW - overlap)
  const svgH = discH + 2 // extra for stroke

  // Sort tiers by order so gold is leftmost
  const sorted = [...tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a as any) - TIER_ORDER.indexOf(b as any)
  )

  return (
    <svg
      width={totalW}
      height={svgH}
      viewBox={`0 0 ${totalW} ${svgH}`}
      aria-label={label}
      className="inline-block flex-shrink-0"
    >
      <title>{label}</title>
      {sorted.map((tier, i) => {
        const colors = TIER_COLORS[tier] || TIER_COLORS.gold
        const cx = discW / 2 + i * (discW - overlap)
        const cy = svgH / 2
        const rx = discW / 2 - 0.5
        const ry = discH / 2 - 0.5
        return (
          <g key={tier}>
            {/* Disc body */}
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={0.8}
            />
            {/* Center hole */}
            <circle cx={cx} cy={cy} r={1.5} fill={colors.stroke} opacity={0.6} />
            {/* Shine highlight */}
            <ellipse
              cx={cx - 1}
              cy={cy - 1.5}
              rx={rx * 0.45}
              ry={ry * 0.3}
              fill={colors.shine}
              opacity={0.5}
            />
          </g>
        )
      })}
    </svg>
  )
}

const ArtistEntriesTable = memo(function ArtistEntriesTable({ tracks, albums, groupId, certifications }: ArtistEntriesTableProps) {
  const t = useSafeTranslations('deepDive.artistEntries')
  const certT = useSafeTranslations('deepDive.certifications')
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks')

  // Build a map of entryKey -> tier list
  const certMap = new Map<string, string[]>()
  if (certifications) {
    for (const cert of certifications) {
      const key = `${cert.entryKey}|${cert.chartType}`
      const existing = certMap.get(key) || []
      existing.push(cert.tier)
      certMap.set(key, existing)
    }
  }

  const tabs = [
    { id: 'tracks', label: t('tracks'), count: tracks.length, icon: faMusic },
    { id: 'albums', label: t('albums'), count: albums.length, icon: faCompactDisc },
  ]

  const currentEntries = activeTab === 'tracks' ? tracks : albums

  // Calculate total #1 weeks for the current tab only (tracks or albums)
  // This prevents double-counting when tracks and albums share the same entryKey
  const totalNumberOneWeeks = currentEntries
    .filter((entry) => entry.peakPosition === 1)
    .reduce((sum, entry) => sum + entry.weeksAtPeak, 0)

  // Get row styling classes based on peak position
  const getRowStyles = (peakPosition: number) => {
    if (peakPosition === 1) {
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100/50'
    }
    return ''
  }

  // Render peak position with ribbon for top 3, blue text for top 10
  const renderPeakPosition = (peakPosition: number) => {
    if (peakPosition === 1) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-yellow-500 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition === 2) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-gray-400 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition === 3) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-amber-600 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition <= 10) {
      return <span className="text-blue-600 font-bold">#{peakPosition}</span>
    }
    return <span className="text-gray-900 font-bold">#{peakPosition}</span>
  }

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{t('title')}</h2>
      
      <div className="mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'tracks' | 'albums')}
        />
      </div>

      {currentEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {activeTab === 'tracks' ? t('noTracks') : t('noAlbums')}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <div className="text-sm text-gray-600 mb-3 text-center">
              {t('total')} {currentEntries.length} {currentEntries.length === 1 ? t('entry') : t('entries')}
              <span className="mx-2">•</span>
              {t('numberOneWeeks')} {totalNumberOneWeeks}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/50 sticky top-0 bg-white/40 backdrop-blur-sm z-10">
                  <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('peak')}
                  </th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('weeksAtPeak')}
                  </th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="text-left py-2 md:py-3 px-2 md:px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('weeksOnChart')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {currentEntries.map((entry) => {
                  const href = `/groups/${groupId}/charts/${entry.chartType.slice(0, -1)}/${entry.slug}`
                  const rowStyles = getRowStyles(entry.peakPosition)
                  return (
                    <tr 
                      key={entry.entryKey} 
                      className={`${rowStyles} hover:bg-white/20 transition-colors`}
                    >
                      <td className="py-2 md:py-3 px-2 md:px-4 text-sm">
                        {renderPeakPosition(entry.peakPosition)}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-sm text-gray-700">
                        {entry.weeksAtPeak}
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Link
                            href={href}
                            className="font-medium text-gray-900 hover:text-[var(--theme-primary-dark)] transition-colors"
                          >
                            {entry.name}
                          </Link>
                          {(() => {
                            const tiers = certMap.get(`${entry.entryKey}|${entry.chartType}`)
                            if (!tiers || tiers.length === 0) return null
                            const label = tiers.map(t => certT(t)).join(', ')
                            return <CertificationDiscs tiers={tiers} label={label} />
                          })()}
                        </span>
                      </td>
                      <td className="py-2 md:py-3 px-2 md:px-4 text-sm text-gray-700">
                        {entry.totalWeeksCharting}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

export default ArtistEntriesTable

