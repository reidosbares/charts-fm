'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'

interface GroupOption {
  id: string
  name: string
  image: string | null
}

interface HighlightedGroupCalloutProps {
  groups: GroupOption[]
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

export default function HighlightedGroupCallout({ groups }: HighlightedGroupCalloutProps) {
  const t = useTranslations('profilePublic')
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter groups based on search query
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
      })
    }
  }, [])

  // Update dropdown position on scroll/resize
  useEffect(() => {
    if (!dropdownOpen) return

    updateDropdownPosition()

    const handleScrollOrResize = () => {
      updateDropdownPosition()
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [dropdownOpen, updateDropdownPosition])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedTrigger = triggerRef.current?.contains(target)
      const clickedDropdown = dropdownRef.current?.contains(target)

      if (!clickedTrigger && !clickedDropdown) {
        setDropdownOpen(false)
        setSearchQuery('')
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [dropdownOpen])

  const handleSelectGroup = async (groupId: string) => {
    setSaving(true)
    setDropdownOpen(false)
    setSearchQuery('')

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightedGroupId: groupId }),
      })

      if (!res.ok) {
        throw new Error('Failed to update')
      }

      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  const openDropdown = () => {
    updateDropdownPosition()
    setDropdownOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  if (groups.length === 0) return null

  const renderDropdown = () => {
    if (!dropdownOpen || !dropdownPosition || !mounted) return null

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-200 rounded-xl shadow-lg max-h-[280px] overflow-y-auto z-[10000]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {/* Search input */}
        {groups.length > 5 && (
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('highlightedGroupSearchPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
            />
          </div>
        )}

        {/* Group options */}
        {filteredGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => handleSelectGroup(group.id)}
            disabled={saving}
            className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
              <SafeImage
                src={group.image}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-medium text-gray-900 truncate flex-1">
              {group.name}
            </span>
          </button>
        ))}

        {/* No results */}
        {searchQuery && filteredGroups.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            {t('highlightedGroupNoResults')}
          </div>
        )}
      </div>,
      document.body
    )
  }

  return (
    <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-dashed border-gray-300 bg-gray-50/50 mb-4 sm:mb-5">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-200 flex items-center justify-center">
          <FontAwesomeIcon icon={faStar} className="text-gray-400 text-xs sm:text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-700 text-xs sm:text-sm mb-0.5 sm:mb-1">
            {t('highlightedGroupCalloutTitle')}
          </h3>
          <p className="text-[11px] sm:text-xs text-gray-500 mb-2.5 sm:mb-3">
            {t('highlightedGroupCalloutDescription')}
          </p>
          <button
            ref={triggerRef}
            onClick={openDropdown}
            disabled={saving}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('highlightedGroupSaving') : t('highlightedGroupChooseButton')}
            {!saving && (
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {renderDropdown()}
    </div>
  )
}
