'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Tooltip from '@/components/Tooltip'

interface LeaveGroupButtonProps {
  groupId: string
  isOwner?: boolean
}

export default function LeaveGroupButton({ groupId, isOwner = false }: LeaveGroupButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLeave = async () => {
    if (isOwner) {
      return
    }

    if (!confirm('Are you sure you want to leave this group?')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to leave group')
      }

      router.push('/groups')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave group')
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || isOwner

  const button = (
    <button
      onClick={handleLeave}
      disabled={isDisabled}
      className={`
        px-4 py-2 rounded-lg transition-colors
        ${
          isOwner
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
            : 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'
        }
      `}
    >
      {isLoading ? 'Leaving...' : 'Leave Group'}
    </button>
  )

  if (isOwner) {
    return (
      <Tooltip content="You can't leave a group that you're the owner of">
        {button}
      </Tooltip>
    )
  }

  return button
}

