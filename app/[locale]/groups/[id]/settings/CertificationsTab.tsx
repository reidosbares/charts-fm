'use client'

import { useState } from 'react'
import Toggle from '@/components/Toggle'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import Toast from '@/components/Toast'

interface CertificationsTabProps {
  groupId: string
  memberCount: number
  initialEnabled: boolean
  initialTrackGold: number
  initialTrackPlatinum: number
  initialTrackDiamond: number
  initialAlbumGold: number
  initialAlbumPlatinum: number
  initialAlbumDiamond: number
}

const TRACK_GOLD_BASE = 3
const TRACK_PLATINUM_BASE = 6
const TRACK_DIAMOND_BASE = 16

const ALBUM_GOLD_BASE = 4
const ALBUM_PLATINUM_BASE = 8
const ALBUM_DIAMOND_BASE = 20

export default function CertificationsTab({
  groupId,
  memberCount,
  initialEnabled,
  initialTrackGold,
  initialTrackPlatinum,
  initialTrackDiamond,
  initialAlbumGold,
  initialAlbumPlatinum,
  initialAlbumDiamond,
}: CertificationsTabProps) {
  const t = useSafeTranslations('groups.settings.certifications')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [trackGold, setTrackGold] = useState(initialTrackGold)
  const [trackPlatinum, setTrackPlatinum] = useState(initialTrackPlatinum)
  const [trackDiamond, setTrackDiamond] = useState(initialTrackDiamond)
  const [albumGold, setAlbumGold] = useState(initialAlbumGold)
  const [albumPlatinum, setAlbumPlatinum] = useState(initialAlbumPlatinum)
  const [albumDiamond, setAlbumDiamond] = useState(initialAlbumDiamond)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const trackValidationError = trackGold >= trackPlatinum
    ? t('goldMustBeLessThanPlatinum')
    : trackPlatinum >= trackDiamond
    ? t('platinumMustBeLessThanDiamond')
    : null

  const albumValidationError = albumGold >= albumPlatinum
    ? t('goldMustBeLessThanPlatinum')
    : albumPlatinum >= albumDiamond
    ? t('platinumMustBeLessThanDiamond')
    : null

  const validationError = trackValidationError || albumValidationError

  const handleSave = async () => {
    if (validationError) return
    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationsEnabled: enabled,
          certTrackGoldThreshold: trackGold,
          certTrackPlatinumThreshold: trackPlatinum,
          certTrackDiamondThreshold: trackDiamond,
          certAlbumGoldThreshold: albumGold,
          certAlbumPlatinumThreshold: albumPlatinum,
          certAlbumDiamondThreshold: albumDiamond,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }

      setSuccess(true)
    } catch {
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    const count = Math.max(memberCount, 1)
    setTrackGold(TRACK_GOLD_BASE * count)
    setTrackPlatinum(TRACK_PLATINUM_BASE * count)
    setTrackDiamond(TRACK_DIAMOND_BASE * count)
    setAlbumGold(ALBUM_GOLD_BASE * count)
    setAlbumPlatinum(ALBUM_PLATINUM_BASE * count)
    setAlbumDiamond(ALBUM_DIAMOND_BASE * count)
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.6)',
    borderColor: 'rgba(0,0,0,0.1)',
    color: 'var(--theme-text)',
  }

  return (
    <div
      className="rounded-xl p-4 sm:p-6"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
        {t('title')}
      </h2>

      <div className="space-y-6">
        <Toggle
          id="certifications-enabled"
          checked={enabled}
          onChange={setEnabled}
          label={t('enableLabel')}
          description={t('enableDescription')}
        />

        {enabled && (
          <div className="space-y-6">
            {/* Track Thresholds */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
                {t('trackThresholds')}
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('trackGoldThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={trackGold}
                  onChange={(e) => setTrackGold(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('trackPlatinumThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={trackPlatinum}
                  onChange={(e) => setTrackPlatinum(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('trackDiamondThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={trackDiamond}
                  onChange={(e) => setTrackDiamond(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              {trackValidationError && (
                <p className="text-sm text-red-500">{trackValidationError}</p>
              )}
            </div>

            {/* Album Thresholds */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
                {t('albumThresholds')}
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('albumGoldThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={albumGold}
                  onChange={(e) => setAlbumGold(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('albumPlatinumThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={albumPlatinum}
                  onChange={(e) => setAlbumPlatinum(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                  {t('albumDiamondThreshold')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={albumDiamond}
                  onChange={(e) => setAlbumDiamond(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={inputStyle}
                />
              </div>

              {albumValidationError && (
                <p className="text-sm text-red-500">{albumValidationError}</p>
              )}
            </div>

            <button
              onClick={handleReset}
              className="text-sm underline"
              style={{ color: 'var(--theme-text)', opacity: 0.7 }}
            >
              {t('resetToSuggested')}
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isSaving || !!validationError}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: 'var(--theme-primary)',
            color: 'var(--theme-button-text)',
          }}
        >
          {isSaving ? t('saving') : t('save')}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <Toast message={t('saved')} onClose={() => setSuccess(false)} />}
      </div>
    </div>
  )
}
