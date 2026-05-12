'use client'

import { useState } from 'react'

interface RevokeInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onRevoked: () => void
  groupId: string
  inviteId: string
  userName: string
}

export default function RevokeInviteModal({
  isOpen,
  onClose,
  onRevoked,
  groupId,
  inviteId,
  userName,
}: RevokeInviteModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/invites?inviteId=${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to revoke invite')
      }

      // Notify parent that revocation was successful
      onRevoked()
      // Close modal
      onClose()
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-[var(--surface-elevated)] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Revoke Invite</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to revoke the invite for <span className="font-semibold">{userName}</span>?
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              They will no longer be able to accept this invite.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-[var(--surface-base)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-base)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[var(--border-subtle)]"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Revoking...' : 'Revoke Invite'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

