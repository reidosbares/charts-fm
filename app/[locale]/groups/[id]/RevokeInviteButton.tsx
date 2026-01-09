'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import RevokeInviteModal from './RevokeInviteModal'

interface RevokeInviteButtonProps {
  groupId: string
  inviteId: string
  userName: string
  onInviteRevoked?: () => void
  compact?: boolean
}

export default function RevokeInviteButton({
  groupId,
  inviteId,
  userName,
  onInviteRevoked,
  compact = false,
}: RevokeInviteButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRevoked, setIsRevoked] = useState(false)

  const handleRevoked = () => {
    setIsRevoked(true)
    onInviteRevoked?.()
  }

  if (isRevoked) {
    return (
      <span className="px-3 py-1 text-sm bg-gray-200 text-gray-600 rounded">
        Revoked!
      </span>
    )
  }

  if (compact) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
          title={`Revoke invite for ${userName}`}
        >
          <FontAwesomeIcon icon={faTimes} className="text-sm" />
        </button>

        <RevokeInviteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onRevoked={handleRevoked}
          groupId={groupId}
          inviteId={inviteId}
          userName={userName}
        />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        title={`Revoke invite for ${userName}`}
      >
        Revoke Invite
      </button>

      <RevokeInviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRevoked={handleRevoked}
        groupId={groupId}
        inviteId={inviteId}
        userName={userName}
      />
    </>
  )
}

