'use client'

import { useState } from 'react'
import RequestsModal from './RequestsModal'

interface RequestsButtonProps {
  groupId: string
  requestCount: number
}

export default function RequestsButton({
  groupId,
  requestCount,
}: RequestsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleRequestProcessed = () => {
    // Refresh the page to update the count
    window.location.reload()
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        disabled={requestCount === 0}
        className={`
          px-4 py-2 rounded-lg font-semibold transition-colors
          ${
            requestCount === 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }
        `}
      >
        Requests ({requestCount})
      </button>

      <RequestsModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestProcessed={handleRequestProcessed}
      />
    </>
  )
}

