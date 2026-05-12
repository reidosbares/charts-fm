'use client'

import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

interface ChartGenerationErrorModalProps {
  isOpen: boolean
  onClose: () => void
  failedUsers: string[]
  aborted: boolean
}

export default function ChartGenerationErrorModal({
  isOpen,
  onClose,
  failedUsers,
  aborted,
}: ChartGenerationErrorModalProps) {
  const t = useSafeTranslations('groups.settings.regenerateCharts.userFetchErrors')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6">
      <div className="bg-[var(--surface-elevated)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-[var(--text-primary)]">
            {aborted ? t('abortedTitle') : t('partialSuccessTitle')}
          </h2>

          <div className="mb-4">
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-3">
              {aborted ? t('abortedMessage') : t('partialSuccessMessage')}
            </p>

            {failedUsers.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)] mb-2">
                  {t('failedUsers')}
                </p>
                <div className="bg-[var(--surface-base)] p-3 sm:p-4 rounded border border-[var(--border-subtle)]">
                  <div className="flex flex-wrap gap-2">
                    {failedUsers.map((username, index) => (
                      <span
                        key={index}
                        className="inline-block px-3 py-1 text-xs sm:text-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800"
                      >
                        {username}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!aborted && failedUsers.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 rounded p-3 sm:p-4 mt-4">
                <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-300">
                  {t('contributionsMissed')}
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded p-3 sm:p-4 mt-4">
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300">
                {t('lastfmOutageTip')}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-4 sm:mt-6">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base font-medium touch-manipulation"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

