'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface InviteNotificationProps {
  groupId: string
  inviteId: string
}

export default function InviteNotification({ groupId, inviteId }: InviteNotificationProps) {
  const t = useSafeTranslations('groups.public')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToAcceptInvite'))
      }

      setIsAccepted(true)
      // Redirect to the group page after a short delay
      setTimeout(() => {
        router.push(`/groups/${groupId}`)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToAcceptInvite'))
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToRejectInvite'))
      }

      setIsRejected(true)
      // Refresh the page to update the UI
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToRejectInvite'))
      setIsLoading(false)
    }
  }

  if (isAccepted) {
    return (
      <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
        <p className="font-semibold">{t('inviteAccepted')}</p>
      </div>
    )
  }

  if (isRejected) {
    return null // Component will be removed after refresh
  }

  return (
    <div className="mb-4 md:mb-6 bg-yellow-100 border border-yellow-400 text-yellow-900 px-3 md:px-4 py-2.5 md:py-3 rounded-lg">
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
          {error}
        </div>
      )}
      <p className="text-sm md:text-base font-semibold mb-3">{t('invitedToJoin')}</p>
      <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="px-4 py-2.5 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base min-h-[44px] sm:min-h-0"
        >
          {isLoading ? t('processing') : t('acceptInvite')}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="px-4 py-2.5 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm md:text-base min-h-[44px] sm:min-h-0"
        >
          {isLoading ? t('processing') : t('rejectInvite')}
        </button>
      </div>
    </div>
  )
}

