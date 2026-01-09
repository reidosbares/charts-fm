'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import RemoveMemberModal from './RemoveMemberModal'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface RemoveMemberButtonProps {
  groupId: string
  userId: string
  memberName: string
  compact?: boolean
}

export default function RemoveMemberButton({
  groupId,
  userId,
  memberName,
  compact = false,
}: RemoveMemberButtonProps) {
  const t = useSafeTranslations('groups.members.removeModal')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)

  const handleRemoved = () => {
    setIsRemoved(true)
  }

  if (isRemoved) {
    return (
      <span className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded">
        {t('removed')}
      </span>
    )
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
          title={t('removeFromGroup', { memberName })}
        >
          <FontAwesomeIcon icon={faTrash} className="text-sm" />
        </button>

        <RemoveMemberModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRemoved={handleRemoved}
          groupId={groupId}
          userId={userId}
          memberName={memberName}
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title={t('removeFromGroup', { memberName })}
      >
        {t('remove')}
      </button>

      <RemoveMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRemoved={handleRemoved}
        groupId={groupId}
        userId={userId}
        memberName={memberName}
      />
    </>
  )
}

