'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

const MAX_GROUP_MEMBERS = 100

interface RequestToJoinButtonProps {
  groupId: string
  hasPendingRequest: boolean
  hasPendingInvite?: boolean
  allowFreeJoin?: boolean
  memberCount?: number
}

export default function RequestToJoinButton({
  groupId,
  hasPendingRequest,
  hasPendingInvite = false,
  allowFreeJoin = false,
  memberCount,
}: RequestToJoinButtonProps) {
  const t = useSafeTranslations('groups.public')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(hasPendingRequest)
  const [hasJoined, setHasJoined] = useState(false)
  const router = useRouter()

  const isAtLimit = memberCount !== undefined && memberCount >= MAX_GROUP_MEMBERS

  const handleRequest = async () => {
    if (hasRequested || hasJoined || hasPendingInvite) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToSendRequest'))
      }

      if (data.joined) {
        // User was directly added as a member
        setHasJoined(true)
        // Redirect to the group page after a short delay
        setTimeout(() => {
          router.push(`/groups/${groupId}`)
        }, 1000)
      } else {
        // Request was sent
        setHasRequested(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToSendRequest'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {isAtLimit && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          {t('groupFullMessage', { count: MAX_GROUP_MEMBERS })}
        </div>
      )}
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <LiquidGlassButton
        onClick={handleRequest}
        disabled={hasRequested || hasJoined || hasPendingInvite || isLoading || isAtLimit}
        variant={hasRequested || hasJoined || hasPendingInvite || isLoading || isAtLimit ? 'neutral' : 'primary'}
        useTheme={false}
        title={
          isAtLimit
            ? t('groupFullTooltip', { count: MAX_GROUP_MEMBERS })
            : hasPendingInvite
            ? t('invitedTooltip')
            : undefined
        }
      >
        {isLoading
          ? (allowFreeJoin ? t('joining') : t('sending'))
          : hasJoined
          ? t('joined')
          : hasPendingInvite
          ? t('invited')
          : hasRequested
          ? t('requestSent')
          : isAtLimit
          ? t('groupFull')
          : allowFreeJoin
          ? t('join')
          : t('requestToJoin')}
      </LiquidGlassButton>
    </div>
  )
}

