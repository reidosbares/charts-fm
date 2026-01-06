'use client'

import { useState } from 'react'
import InviteMemberModal from './InviteMemberModal'
import LiquidGlassButton from '@/components/LiquidGlassButton'

interface InviteMemberButtonProps {
  groupId: string
  onInviteSent?: () => void
}

export default function InviteMemberButton({ groupId, onInviteSent }: InviteMemberButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <LiquidGlassButton
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        useTheme
      >
        Invite Member
      </LiquidGlassButton>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onInviteSent={onInviteSent}
      />
    </>
  )
}

