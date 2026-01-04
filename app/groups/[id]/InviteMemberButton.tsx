'use client'

import { useState } from 'react'
import InviteMemberModal from './InviteMemberModal'

interface InviteMemberButtonProps {
  groupId: string
}

export default function InviteMemberButton({ groupId }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
      >
        Invite Member
      </button>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
      />
    </>
  )
}

