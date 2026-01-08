'use client'

import { useState } from 'react'
import DeleteGroupModal from './DeleteGroupModal'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface DeleteGroupTabProps {
  groupId: string
  groupName: string
}

export default function DeleteGroupTab({
  groupId,
  groupName,
}: DeleteGroupTabProps) {
  const t = useSafeTranslations('groups.settings.deleteGroup')
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-red-600">{t('title')}</h2>
          <p className="text-sm md:text-base text-gray-600">
            {t('description')}
          </p>
        </div>

        <div className="border border-red-200 rounded-lg p-4 md:p-6 bg-red-50">
          <h3 className="text-base md:text-lg font-semibold text-red-800 mb-2 md:mb-3">
            {t('warning')}
          </h3>
          <p className="text-xs md:text-sm text-gray-700 mb-3 md:mb-4">
            {t('willDelete')}
          </p>
          <ul className="text-xs md:text-sm text-gray-700 list-disc list-inside mb-4 md:mb-6 space-y-1">
            <li>{t('allCharts')}</li>
            <li>{t('allInvites')}</li>
            <li>{t('allRequests')}</li>
            <li>{t('allMembers')}</li>
          </ul>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            {t('deleteButton')}
          </button>
        </div>
      </div>

      <DeleteGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        groupName={groupName}
      />
    </>
  )
}

