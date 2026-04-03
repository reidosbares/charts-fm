'use client'

import { useState } from 'react'
import useSWR from 'swr'
import dynamic from 'next/dynamic'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

// Lazy load modal to reduce initial bundle size
const InviteMemberModal = dynamic(() => import('./InviteMemberModal'), {
  ssr: false,
  loading: () => null,
})

const MAX_GROUP_MEMBERS = 100

interface InviteMemberButtonProps {
  groupId: string
  onInviteSent?: () => void
}

export default function InviteMemberButton({ groupId, onInviteSent }: InviteMemberButtonProps) {
  const t = useSafeTranslations('groups.members')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: membersData, mutate: mutateMembers } = useSWR<{ members?: any[] }>(
    groupId ? `/api/groups/${groupId}/members` : null
  )
  const memberCount = membersData?.members?.length ?? null

  const isAtLimit = memberCount !== null && memberCount >= MAX_GROUP_MEMBERS

  return (
    <>
      <LiquidGlassButton
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        useTheme
        disabled={isAtLimit}
        title={isAtLimit ? `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members` : undefined}
      >
        {t('inviteMember')}
      </LiquidGlassButton>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onInviteSent={() => {
          if (onInviteSent) onInviteSent()
          mutateMembers()
        }}
        memberCount={memberCount}
      />
    </>
  )
}

