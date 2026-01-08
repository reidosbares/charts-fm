'use client'

import { useSafeTranslations } from '@/hooks/useSafeTranslations'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {aborted ? t('abortedTitle') : t('partialSuccessTitle')}
          </h2>

          <div className="mb-4">
            <p className="text-gray-700 mb-3">
              {aborted ? t('abortedMessage') : t('partialSuccessMessage')}
            </p>

            {failedUsers.length > 0 && (
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-2">
                  {t('failedUsers')}
                </p>
                <ul className="list-disc list-inside bg-gray-50 p-3 rounded border border-gray-200">
                  {failedUsers.map((username, index) => (
                    <li key={index} className="text-gray-700">
                      {username}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
              <p className="text-sm text-blue-800">
                {t('lastfmOutageTip')}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

