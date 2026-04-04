'use client'

import { useState } from 'react'
import Toggle from '@/components/Toggle'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import Toast from '@/components/Toast'

interface CertificationsTabProps {
  groupId: string
  memberCount: number
  initialEnabled: boolean
  initialGold: number
  initialPlatinum: number
  initialDiamond: number
}

const GOLD_BASE = 4
const PLATINUM_BASE = 8
const DIAMOND_BASE = 20

export default function CertificationsTab({
  groupId,
  memberCount,
  initialEnabled,
  initialGold,
  initialPlatinum,
  initialDiamond,
}: CertificationsTabProps) {
  const t = useSafeTranslations('groups.settings.certifications')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [gold, setGold] = useState(initialGold)
  const [platinum, setPlatinum] = useState(initialPlatinum)
  const [diamond, setDiamond] = useState(initialDiamond)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validationError = gold >= platinum
    ? t('goldMustBeLessThanPlatinum')
    : platinum >= diamond
    ? t('platinumMustBeLessThanDiamond')
    : null

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
          certGoldThreshold: gold,
          certPlatinumThreshold: platinum,
          certDiamondThreshold: diamond,
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
    setGold(GOLD_BASE * count)
    setPlatinum(PLATINUM_BASE * count)
    setDiamond(DIAMOND_BASE * count)
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {t('goldThreshold')}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={gold}
                onChange={(e) => setGold(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(0,0,0,0.1)',
                  color: 'var(--theme-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {t('platinumThreshold')}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={platinum}
                onChange={(e) => setPlatinum(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(0,0,0,0.1)',
                  color: 'var(--theme-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
                {t('diamondThreshold')}
              </label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={diamond}
                onChange={(e) => setDiamond(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  borderColor: 'rgba(0,0,0,0.1)',
                  color: 'var(--theme-text)',
                }}
              />
            </div>

            {validationError && (
              <p className="text-sm text-red-500">{validationError}</p>
            )}

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
