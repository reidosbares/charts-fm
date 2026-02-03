'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShare } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

// Lazy load modal to reduce initial bundle size
const ShareGroupModal = dynamic(() => import('./ShareGroupModal'), {
  ssr: false,
  loading: () => null,
})

interface ShareGroupButtonProps {
  groupId: string
}

export default function ShareGroupButton({ groupId }: ShareGroupButtonProps) {
  const t = useSafeTranslations('groups.share')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <LiquidGlassButton
        ref={buttonRef}
        onClick={() => setIsModalOpen(true)}
        variant="secondary"
        size="sm"
        useTheme={false}
        icon={<FontAwesomeIcon icon={faShare} className="text-xs md:text-sm" />}
        className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30 !px-2 !py-1.5 md:!px-3 md:!py-2"
        aria-label={t('shareGroup')}
      />

      <ShareGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        buttonRef={buttonRef}
      />
    </>
  )
}

