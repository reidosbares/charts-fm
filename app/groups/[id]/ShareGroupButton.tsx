'use client'

import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShare } from '@fortawesome/free-solid-svg-icons'
import ShareGroupModal from './ShareGroupModal'

interface ShareGroupButtonProps {
  groupId: string
}

export default function ShareGroupButton({ groupId }: ShareGroupButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsModalOpen(true)}
        className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[var(--theme-primary)] text-[var(--theme-button-text)] hover:bg-[var(--theme-primary-light)] transition-all shadow-lg hover:shadow-xl flex items-center justify-center z-10"
        aria-label="Share group"
      >
        <FontAwesomeIcon icon={faShare} className="text-lg" />
      </button>

      <ShareGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        buttonRef={buttonRef}
      />
    </>
  )
}

