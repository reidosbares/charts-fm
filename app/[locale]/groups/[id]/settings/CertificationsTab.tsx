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
  const [trackGold, setTrackGold] = useState(String(initialTrackGold))
  const [trackPlatinum, setTrackPlatinum] = useState(String(initialTrackPlatinum))
  const [trackDiamond, setTrackDiamond] = useState(String(initialTrackDiamond))
  const [albumGold, setAlbumGold] = useState(String(initialAlbumGold))
  const [albumPlatinum, setAlbumPlatinum] = useState(String(initialAlbumPlatinum))
  const [albumDiamond, setAlbumDiamond] = useState(String(initialAlbumDiamond))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const numTrackGold = parseFloat(trackGold)
  const numTrackPlatinum = parseFloat(trackPlatinum)
  const numTrackDiamond = parseFloat(trackDiamond)
  const numAlbumGold = parseFloat(albumGold)
  const numAlbumPlatinum = parseFloat(albumPlatinum)
  const numAlbumDiamond = parseFloat(albumDiamond)

  const allValues = [numTrackGold, numTrackPlatinum, numTrackDiamond, numAlbumGold, numAlbumPlatinum, numAlbumDiamond]
  const hasEmptyOrInvalid = allValues.some(v => isNaN(v) || v <= 0)

  const trackValidationError = hasEmptyOrInvalid
    ? t('thresholdsMustBePositive')
    : numTrackGold >= numTrackPlatinum
    ? t('goldMustBeLessThanPlatinum')
    : numTrackPlatinum >= numTrackDiamond
    ? t('platinumMustBeLessThanDiamond')
    : null

  const albumValidationError = hasEmptyOrInvalid
    ? null
    : numAlbumGold >= numAlbumPlatinum
    ? t('goldMustBeLessThanPlatinum')
    : numAlbumPlatinum >= numAlbumDiamond
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
          certTrackGoldThreshold: numTrackGold,
          certTrackPlatinumThreshold: numTrackPlatinum,
          certTrackDiamondThreshold: numTrackDiamond,
          certAlbumGoldThreshold: numAlbumGold,
          certAlbumPlatinumThreshold: numAlbumPlatinum,
          certAlbumDiamondThreshold: numAlbumDiamond,
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
    setTrackGold(String(TRACK_GOLD_BASE * count))
    setTrackPlatinum(String(TRACK_PLATINUM_BASE * count))
    setTrackDiamond(String(TRACK_DIAMOND_BASE * count))
    setAlbumGold(String(ALBUM_GOLD_BASE * count))
    setAlbumPlatinum(String(ALBUM_PLATINUM_BASE * count))
    setAlbumDiamond(String(ALBUM_DIAMOND_BASE * count))
  }

  const inputStyle = {
    borderColor: 'rgba(0,0,0,0.1)',
    color: 'var(--theme-text)',
  }
  const inputClassName = 'bg-white/60 dark:bg-[rgb(var(--surface-card-rgb)/0.6)]'

  return (
    <>
      <Toast
        message={t('saved')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
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
                  onChange={(e) => setTrackGold(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
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
                  onChange={(e) => setTrackPlatinum(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
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
                  onChange={(e) => setTrackDiamond(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
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
                  onChange={(e) => setAlbumGold(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
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
                  onChange={(e) => setAlbumPlatinum(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
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
                  onChange={(e) => setAlbumDiamond(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inputClassName}`}
                  style={inputStyle}
                />
              </div>

              {albumValidationError && (
                <p className="text-sm text-red-500">{albumValidationError}</p>
              )}
            </div>

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-white/50 dark:bg-[rgb(var(--surface-card-rgb)/0.5)]"
              style={{
                color: 'var(--theme-text)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
              }}
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
      </div>
    </div>
    </>
  )
}
