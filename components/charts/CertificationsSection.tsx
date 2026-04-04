'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import SafeImage from '@/components/SafeImage'

interface Certification {
  id: string
  tier: string
  awardedAt: string
  thresholdAtAward: number
  awardedBy: { id: string; name: string | null }
}

interface CertificationThresholds {
  enabled: boolean
  trackGold: number
  trackPlatinum: number
  trackDiamond: number
  albumGold: number
  albumPlatinum: number
  albumDiamond: number
}

interface CertificationsSectionProps {
  groupId: string
  chartType: string
  entryKey: string
  totalVS: number
  certifications: Certification[]
  thresholds: CertificationThresholds
  canCertify: boolean
  onCertificationAwarded: (cert: Certification) => void
  onCertificationRevoked: (tier: string) => void
  imageUrl?: string | null
  entryName: string
}

interface Particle {
  id: number
  x: number
  color: string
  size: number
  drift: number
  delay: number
  duration: number
  rotation: number
  shape: 'circle' | 'square' | 'rect'
}

const TIERS = [
  { key: 'gold', colors: { from: '#FFD700', to: '#B8860B', border: '#B8860B', glow: 'rgba(255,215,0,0.5)', glowBright: 'rgba(255,215,0,0.8)', text: '#FFD700', plaque: '#3d3520', plaqueBorder: '#B8860B', particles: ['#FFD700', '#FFA500', '#B8860B', '#FFE066', '#FFEC8B'] } },
  { key: 'platinum', colors: { from: '#E5E4E2', to: '#A8A8A0', border: '#8E8D8A', glow: 'rgba(180,160,220,0.5)', glowBright: 'rgba(180,160,220,0.85)', text: '#E5E4E2', plaque: '#2a2a2a', plaqueBorder: '#8E8D8A', particles: ['#E5E4E2', '#C0C0C0', '#D8D8D8', '#A8A8A0', '#F0F0F0'] } },
  { key: 'diamond', colors: { from: '#B9F2FF', to: '#4FC3F7', border: '#4FC3F7', glow: 'rgba(79,195,247,0.5)', glowBright: 'rgba(79,195,247,0.8)', text: '#B9F2FF', plaque: '#1a2a30', plaqueBorder: '#4FC3F7', particles: ['#B9F2FF', '#4FC3F7', '#81D4FA', '#E0F7FA', '#00BCD4'] } },
] as const

const TIER_ORDER = ['gold', 'platinum', 'diamond'] as const

function getThreshold(thresholds: CertificationThresholds, tier: string, chartType: string): number {
  const isAlbum = chartType === 'albums'
  switch (tier) {
    case 'gold': return isAlbum ? thresholds.albumGold : thresholds.trackGold
    case 'platinum': return isAlbum ? thresholds.albumPlatinum : thresholds.trackPlatinum
    case 'diamond': return isAlbum ? thresholds.albumDiamond : thresholds.trackDiamond
    default: return 0
  }
}

function Fanfare({ particles, tierColor }: { particles: Particle[], tierColor: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (particles.length === 0 || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 9999 }}>
      {/* Flash overlay */}
      <div className="fanfare-flash absolute inset-0" style={{ background: tierColor }} />
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left: `${p.x}%`,
            bottom: 0,
            width: p.size,
            height: p.shape === 'rect' ? p.size * 0.4 : p.size,
            background: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            '--drift': `${p.drift}px`,
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
            '--rotation': `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}

      <style jsx>{`
        .fanfare-flash {
          animation: flash 0.5s ease-out forwards;
        }
        @keyframes flash {
          0% { opacity: 0.2; }
          100% { opacity: 0; }
        }
        .confetti-piece {
          animation:
            confetti-rise var(--duration) cubic-bezier(0.2, 0.8, 0.4, 1) var(--delay) forwards,
            confetti-fade var(--duration) ease-in var(--delay) forwards;
        }
        @keyframes confetti-rise {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg) scale(0.5);
            opacity: 1;
          }
          15% {
            transform: translateY(-115vh) translateX(calc(var(--drift) * 0.15)) rotate(calc(var(--rotation) * 0.15)) scale(1);
            opacity: 1;
          }
          30% {
            transform: translateY(-110vh) translateX(calc(var(--drift) * 0.3)) rotate(calc(var(--rotation) * 0.3)) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(0) translateX(var(--drift)) rotate(var(--rotation)) scale(0.8);
            opacity: 0;
          }
        }
        @keyframes confetti-fade {
          0%, 60% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>,
    document.body
  )
}

export default function CertificationsSection({
  groupId,
  chartType,
  entryKey,
  totalVS,
  certifications,
  thresholds,
  canCertify,
  onCertificationAwarded,
  onCertificationRevoked,
  imageUrl,
  entryName,
}: CertificationsSectionProps) {
  const t = useSafeTranslations('deepDive.certifications')
  const [awarding, setAwarding] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmingRevoke, setConfirmingRevoke] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fanfareParticles, setFanfareParticles] = useState<Particle[]>([])
  const [fanfareTierColor, setFanfareTierColor] = useState<string>('')
  const particleIdRef = useRef(0)

  const awardedTiers = new Set(certifications.map(c => c.tier))

  const isAwarded = (tier: string) => awardedTiers.has(tier)

  const isEligible = (tier: string) => {
    if (isAwarded(tier)) return false
    const threshold = getThreshold(thresholds, tier, chartType)
    if (totalVS < threshold) return false
    const tierIndex = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number])
    if (tierIndex > 0 && !isAwarded(TIER_ORDER[tierIndex - 1])) return false
    return true
  }

  const getCertification = (tier: string) => certifications.find(c => c.tier === tier)

  const spawnFanfare = useCallback((_buttonEl: HTMLElement, tierColors: readonly string[]) => {
    const newParticles: Particle[] = []
    const count = 80

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: Math.random() * 100,
        color: tierColors[Math.floor(Math.random() * tierColors.length)],
        size: 6 + Math.random() * 8,
        drift: (Math.random() - 0.5) * 200,
        delay: Math.random() * 0.3,
        duration: 2.5 + Math.random() * 1.5,
        rotation: (Math.random() - 0.5) * 1440,
        shape: (['circle', 'square', 'rect'] as const)[Math.floor(Math.random() * 3)],
      })
    }

    setFanfareParticles(newParticles)
    setTimeout(() => setFanfareParticles([]), 4500)
  }, [])

  const handleAward = async (tier: string, buttonEl: HTMLElement) => {
    setAwarding(tier)
    setError(null)

    const tierData = TIERS.find(t => t.key === tier)

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

      if (tierData) {
        setFanfareTierColor(tierData.colors.glow)
        spawnFanfare(buttonEl, tierData.colors.particles)
      }

      onCertificationAwarded(cert)
    } catch {
      setError('Failed to award certification')
    } finally {
      setAwarding(null)
    }
  }

  const handleRevoke = async (tier: string) => {
    setRevoking(tier)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}/certifications`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartType, entryKey, tier }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to revoke certification')
        return
      }

      onCertificationRevoked(tier)
    } catch {
      setError('Failed to revoke certification')
    } finally {
      setRevoking(null)
      setConfirmingRevoke(null)
    }
  }

  const canRevoke = (tier: string) => {
    if (!isAwarded(tier)) return false
    // Can only revoke the highest awarded tier
    const tierIndex = TIER_ORDER.indexOf(tier as typeof TIER_ORDER[number])
    if (tierIndex < TIER_ORDER.length - 1 && isAwarded(TIER_ORDER[tierIndex + 1])) return false
    return true
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30 overflow-visible">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
        {t('title')}
      </h2>

      <Fanfare particles={fanfareParticles} tierColor={fanfareTierColor} />

      <div className="flex gap-4 sm:gap-5 md:gap-7 overflow-x-auto py-8 px-4 -my-8 -mx-4 scrollbar-hide">
        {TIERS.map((tier) => {
          const awarded = isAwarded(tier.key)
          const eligible = isEligible(tier.key)
          const cert = getCertification(tier.key)
          const threshold = getThreshold(thresholds, tier.key, chartType)
          const isCurrentlyAwarding = awarding === tier.key
          const active = awarded || (eligible && canCertify)

          return (
            <div key={tier.key} className="flex-shrink-0 md:flex-shrink md:flex-1 flex flex-col items-center w-[150px] md:w-auto md:min-w-0">
              {/* Frame / Plaque */}
              <div
                className={`relative w-full transition-all duration-300 ${awarded ? `shimmer-${tier.key}` : ''}`}
                style={{
                  aspectRatio: '1',
                  background: `linear-gradient(145deg, ${tier.colors.plaque}, #0e0e0e)`,
                  border: awarded
                    ? '2px solid transparent'
                    : (eligible && canCertify)
                    ? `2px solid ${tier.colors.plaqueBorder}`
                    : '2px solid #222',
                  borderRadius: '12px',
                  boxShadow: awarded
                    ? undefined
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                  opacity: active ? 1 : 0.3,
                  animation: eligible && canCertify ? `pulse-${tier.key} 2s ease-in-out infinite` : undefined,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  '--shimmer-from': tier.colors.from,
                  '--shimmer-to': tier.colors.to,
                  '--shimmer-glow': tier.colors.glow,
                  '--shimmer-glow-bright': tier.colors.glowBright,
                } as React.CSSProperties}
              >
                {/* Disc with artwork */}
                <div
                  className="relative rounded-full flex-shrink-0"
                  style={{
                    width: '70%',
                    aspectRatio: '1',
                    background: `conic-gradient(from 0deg, ${tier.colors.from}, ${tier.colors.to}, ${tier.colors.from}, ${tier.colors.to}, ${tier.colors.from})`,
                    boxShadow: awarded
                      ? `0 2px 12px ${tier.colors.glow}`
                      : undefined,
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
                      border: `2px solid ${tier.colors.to}`,
                      background: '#141414',
                    }}
                  >
                    {awarded && imageUrl ? (
                      <SafeImage
                        src={imageUrl}
                        alt={entryName}
                        className="object-cover w-full h-full"
                        fill
                        sizes="80px"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: `radial-gradient(circle, ${tier.colors.to}33, #141414)`,
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
                      background: tier.colors.to,
                      boxShadow: `0 0 4px ${tier.colors.glow}`,
                    }}
                  />
                </div>

                {/* Plaque text area */}
                <div
                  className="w-full rounded-md py-1.5 px-2 text-center"
                  style={{
                    background: `linear-gradient(180deg, ${tier.colors.from}22, ${tier.colors.from}11)`,
                    border: `1px solid ${tier.colors.from}33`,
                  }}
                >
                  <div
                    className="text-[10px] sm:text-xs font-bold tracking-widest"
                    style={{ color: tier.colors.text }}
                  >
                    {t(tier.key)}
                  </div>
                  <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: tier.colors.text, opacity: 0.6 }}>
                    {threshold.toFixed(1)} VS
                  </div>
                  {awarded && cert && (
                    <div className="text-[9px] sm:text-[10px] mt-0.5" style={{ color: tier.colors.text, opacity: 0.5 }}>
                      {formatDate(cert.awardedAt)}
                    </div>
                  )}
                </div>
              </div>

              {/* Award button (below the frame) */}
              {eligible && canCertify && (
                <button
                  onClick={(e) => handleAward(tier.key, e.currentTarget)}
                  disabled={isCurrentlyAwarding}
                  className="mt-2 px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all"
                  style={{
                    background: tier.colors.text,
                    color: '#111',
                  }}
                >
                  {isCurrentlyAwarding ? '...' : t('award')}
                </button>
              )}

              {/* Revoke button (creator only, awarded, highest tier) */}
              {awarded && canCertify && canRevoke(tier.key) && (
                confirmingRevoke === tier.key ? (
                  <div className="mt-2 flex items-center gap-1.5">
                    <button
                      onClick={() => handleRevoke(tier.key)}
                      disabled={revoking === tier.key}
                      className="px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-bold transition-all"
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        opacity: revoking === tier.key ? 0.5 : 1,
                      }}
                    >
                      {revoking === tier.key ? '...' : t('revoke')}
                    </button>
                    <button
                      onClick={() => setConfirmingRevoke(null)}
                      className="px-2 py-1 rounded text-[10px] sm:text-[11px] transition-all"
                      style={{ background: '#333', color: '#999' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingRevoke(tier.key)}
                    className="mt-2 text-[10px] sm:text-[11px] transition-all hover:opacity-100"
                    style={{ color: '#666', opacity: 0.5 }}
                  >
                    {t('revoke')}
                  </button>
                )
              )}

              {/* Eligible text (below frame, non-creator) */}
              {eligible && !canCertify && (
                <div className="mt-2 text-[11px] sm:text-xs" style={{ color: tier.colors.text }}>
                  {t('eligible')}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mt-2 text-xs text-red-500">{error}</div>
      )}

      {/* Pulse and shimmer animations */}
      <style jsx>{`
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 12px rgba(255,215,0,0.15); }
          50% { box-shadow: 0 0 28px rgba(255,215,0,0.4); }
        }
        @keyframes pulse-platinum {
          0%, 100% { box-shadow: 0 0 12px rgba(200,200,200,0.15); }
          50% { box-shadow: 0 0 28px rgba(200,200,200,0.4); }
        }
        @keyframes pulse-diamond {
          0%, 100% { box-shadow: 0 0 12px rgba(79,195,247,0.15); }
          50% { box-shadow: 0 0 28px rgba(79,195,247,0.4); }
        }
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
}
