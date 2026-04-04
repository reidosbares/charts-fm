'use client'

import { useState } from 'react'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface Certification {
  id: string
  tier: string
  awardedAt: string
  thresholdAtAward: number
  awardedBy: { id: string; name: string | null }
}

interface CertificationThresholds {
  enabled: boolean
  gold: number
  platinum: number
  diamond: number
}

interface CertificationsSectionProps {
  groupId: string
  chartType: string
  entryKey: string
  totalVS: number
  certifications: Certification[]
  thresholds: CertificationThresholds
  isCreator: boolean
  onCertificationAwarded: (cert: Certification) => void
}

const TIERS = [
  { key: 'gold', label: 'GOLD', colors: { from: '#FFD700', to: '#B8860B', border: '#B8860B', glow: 'rgba(255,215,0,0.3)', text: '#FFD700' } },
  { key: 'platinum', label: 'PLATINUM', colors: { from: '#E5E4E2', to: '#A8A8A0', border: '#8E8D8A', glow: 'rgba(200,200,200,0.2)', text: '#E5E4E2' } },
  { key: 'diamond', label: 'DIAMOND', colors: { from: '#B9F2FF', to: '#4FC3F7', border: '#4FC3F7', glow: 'rgba(79,195,247,0.3)', text: '#B9F2FF' } },
] as const

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const

function getThreshold(thresholds: CertificationThresholds, tier: string): number {
  switch (tier) {
    case 'gold': return thresholds.gold
    case 'platinum': return thresholds.platinum
    case 'diamond': return thresholds.diamond
    default: return 0
  }
}

export default function CertificationsSection({
  groupId,
  chartType,
  entryKey,
  totalVS,
  certifications,
  thresholds,
  isCreator,
  onCertificationAwarded,
}: CertificationsSectionProps) {
  const t = useSafeTranslations('deepDive.certifications')
  const [awarding, setAwarding] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const awardedTiers = new Set(certifications.map(c => c.tier))

  const isAwarded = (tier: string) => awardedTiers.has(tier)

  const isEligible = (tier: string) => {
    if (isAwarded(tier)) return false
    const threshold = getThreshold(thresholds, tier)
    if (totalVS < threshold) return false
    // Previous tier must be awarded
    const tierIndex = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number])
    if (tierIndex > 0 && !isAwarded(TIER_ORDER[tierIndex - 1])) return false
    return true
  }

  const getCertification = (tier: string) => certifications.find(c => c.tier === tier)

  const handleAward = async (tier: string) => {
    setAwarding(tier)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}/certifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType, entryKey, tier }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to award certification')
        return
      }

      const cert = await res.json()
      onCertificationAwarded(cert)
    } catch {
      setError('Failed to award certification')
    } finally {
      setAwarding(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30">
      <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4" style={{ color: 'var(--theme-text)' }}>
        {t('title')}
      </h3>

      <div className="flex gap-3 sm:gap-4 md:gap-5 overflow-x-auto pb-2">
        {TIERS.map((tier) => {
          const awarded = isAwarded(tier.key)
          const eligible = isEligible(tier.key)
          const cert = getCertification(tier.key)
          const threshold = getThreshold(thresholds, tier.key)
          const isCurrentlyAwarding = awarding === tier.key

          return (
            <div key={tier.key} className="flex-shrink-0 text-center" style={{ minWidth: '130px' }}>
              <div
                className={`rounded-2xl p-4 sm:p-5 transition-all duration-300 ${
                  eligible && isCreator ? 'cursor-pointer' : ''
                }`}
                style={{
                  background: 'linear-gradient(180deg, #1c1c1c, #141414)',
                  border: awarded
                    ? `1px solid ${tier.colors.border}`
                    : eligible && isCreator
                    ? `2px solid ${tier.colors.border}`
                    : '1px solid #222',
                  boxShadow: awarded
                    ? `0 0 12px ${tier.colors.glow}`
                    : undefined,
                  opacity: awarded || (eligible && isCreator) ? 1 : 0.3,
                  animation: eligible && isCreator ? `pulse-${tier.key} 2s ease-in-out infinite` : undefined,
                }}
              >
                {/* Disc */}
                <div
                  className="mx-auto mb-2 sm:mb-3 flex items-center justify-center rounded-full"
                  style={{
                    width: '64px',
                    height: '64px',
                    background: `linear-gradient(135deg, ${tier.colors.from} 0%, ${tier.colors.to} 50%, ${tier.colors.from} 100%)`,
                    boxShadow: awarded ? `0 2px 8px ${tier.colors.glow}` : undefined,
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: '22px',
                      height: '22px',
                      background: '#141414',
                      border: `2px solid ${tier.colors.to}`,
                    }}
                  />
                </div>

                {/* Label */}
                <div
                  className="text-xs sm:text-sm font-bold tracking-wider"
                  style={{ color: tier.colors.text }}
                >
                  {tier.label}
                </div>

                {/* Threshold */}
                <div className="text-[10px] sm:text-xs mt-1" style={{ color: '#666' }}>
                  {threshold.toFixed(1)} VS
                </div>

                {/* Award button (creator only, eligible only) */}
                {eligible && isCreator && (
                  <button
                    onClick={() => handleAward(tier.key)}
                    disabled={isCurrentlyAwarding}
                    className="mt-2 sm:mt-3 px-3 sm:px-4 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all"
                    style={{
                      background: tier.colors.text,
                      color: '#111',
                    }}
                  >
                    {isCurrentlyAwarding ? '...' : t('award')}
                  </button>
                )}
              </div>

              {/* Date or Eligible text */}
              <div className="mt-2 text-[11px] sm:text-xs" style={{ color: awarded ? '#999' : eligible && isCreator ? tier.colors.text : 'transparent' }}>
                {awarded && cert
                  ? formatDate(cert.awardedAt)
                  : eligible && isCreator
                  ? t('eligible')
                  : '\u00A0'}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-500">{error}</div>
      )}

      {/* Pulse animations */}
      <style jsx>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 12px rgba(255,215,0,0.15); }
          50% { box-shadow: 0 0 24px rgba(255,215,0,0.35); }
        }
        @keyframes pulse-platinum {
          0%, 100% { box-shadow: 0 0 12px rgba(200,200,200,0.15); }
          50% { box-shadow: 0 0 24px rgba(200,200,200,0.35); }
        }
        @keyframes pulse-diamond {
          0%, 100% { box-shadow: 0 0 12px rgba(79,195,247,0.15); }
          50% { box-shadow: 0 0 24px rgba(79,195,247,0.35); }
        }
      `}</style>
    </div>
  )
}
