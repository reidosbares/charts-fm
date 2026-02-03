'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

export default function ClearHighlightedGroupButton() {
  const t = useTranslations('profilePublic')
  const router = useRouter()
  const [clearing, setClearing] = useState(false)

  const handleClear = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setClearing(true)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightedGroupId: null }),
      })

      if (!res.ok) {
        throw new Error('Failed to clear')
      }

      router.refresh()
    } catch {
      setClearing(false)
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={clearing}
      className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(4px)',
      }}
      aria-label={t('clearHighlightedGroup')}
      title={t('clearHighlightedGroup')}
    >
      <FontAwesomeIcon 
        icon={faTimes} 
        className="text-xs"
        style={{ color: 'var(--theme-text)', opacity: 0.7 }}
      />
    </button>
  )
}
