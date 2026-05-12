'use client'

import { useState, useTransition } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandsClapping } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface KudosButtonProps {
  slug: string
  initialCount: number
  initialGiven: boolean
  canGive: boolean
}

export default function KudosButton({
  slug,
  initialCount,
  initialGiven,
  canGive,
}: KudosButtonProps) {
  const t = useSafeTranslations('news')
  const [count, setCount] = useState(initialCount)
  const [given, setGiven] = useState(initialGiven)
  const [isPending, startTransition] = useTransition()

  const locked = given || !canGive
  const label = canGive ? t('kudosGive') : t('kudosLogIn')

  const handleClick = () => {
    if (locked || isPending) return

    // Optimistic update — only increments, never decrements
    setGiven(true)
    setCount((c) => c + 1)

    startTransition(async () => {
      try {
        const res = await fetch(`/api/news/${encodeURIComponent(slug)}/kudos`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Failed to give kudos')
        const data = (await res.json()) as { count: number; given: boolean }
        setCount(data.count)
        setGiven(data.given)
      } catch {
        // Roll back optimistic update
        setGiven(false)
        setCount((c) => Math.max(0, c - 1))
      }
    })
  }

  return (
    <div className="not-prose inline-flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={locked || isPending}
        aria-label={label}
        title={label}
        aria-pressed={given}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
          locked ? 'cursor-not-allowed opacity-50' : 'hover:brightness-110 cursor-pointer'
        }`}
        style={{
          backgroundColor: 'var(--surface-base)',
          color: 'var(--text-primary)',
        }}
      >
        <FontAwesomeIcon icon={faHandsClapping} className="w-4 h-4" />
        <span>{label}</span>
      </button>
      {count > 0 && (
        <span className="text-sm font-semibold text-[var(--text-secondary)]" aria-live="polite">
          {count}
        </span>
      )}
    </div>
  )
}
