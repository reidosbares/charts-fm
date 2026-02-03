'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil, faCheck } from '@fortawesome/free-solid-svg-icons'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import SafeImage from '@/components/SafeImage'
import { getDefaultArtistImage } from '@/lib/default-images'

export interface DriverArtistOption {
  entryKey: string
  name: string
  slug: string
}

interface HighlightedGroupFeaturedArtistProps {
  groupId: string
  featuredEntry: DriverArtistOption | null
  featuredEntryVS?: number
  driverArtists: DriverArtistOption[]
  isSelf: boolean
  currentEntryKey: string | null
}

interface FeaturedArtistModalProps {
  isOpen: boolean
  onClose: () => void
  driverArtists: DriverArtistOption[]
  currentEntryKey: string | null
  onSelect: (entryKey: string | null) => void
  saving: boolean
}

interface DropdownPosition {
  top: number
  left: number
  width: number
}

function FeaturedArtistModal({
  isOpen,
  onClose,
  driverArtists,
  currentEntryKey,
  onSelect,
  saving,
}: FeaturedArtistModalProps) {
  const t = useTranslations('profilePublic')
  const tCommon = useTranslations('common')
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get current selection label
  const currentSelection = currentEntryKey 
    ? driverArtists.find(a => a.entryKey === currentEntryKey)?.name 
    : null

  // Filter artists based on search query
  const filteredArtists = driverArtists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setDropdownOpen(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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
      if (e.key === 'Escape') {
        if (dropdownOpen) {
          setDropdownOpen(false)
        } else if (isOpen) {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, dropdownOpen, onClose])

  const handleSelectArtist = (entryKey: string | null) => {
    setDropdownOpen(false)
    setSearchQuery('')
    onSelect(entryKey)
  }

  const openDropdown = () => {
    updateDropdownPosition()
    setDropdownOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  if (!isOpen || !mounted) return null

  // Render dropdown via portal
  const renderDropdown = () => {
    if (!dropdownOpen || !dropdownPosition) return null

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-white border border-gray-200 rounded-xl shadow-lg max-h-[200px] overflow-y-auto z-[10000]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {/* None option */}
        <button
          type="button"
          onClick={() => handleSelectArtist(null)}
          disabled={saving}
          className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
            currentEntryKey === null
              ? 'bg-yellow-50 text-yellow-700'
              : 'hover:bg-gray-50 text-gray-500'
          }`}
        >
          <span className="text-sm font-medium">{t('featuredArtistNone')}</span>
          {currentEntryKey === null && (
            <FontAwesomeIcon icon={faCheck} className="text-yellow-600 text-xs" />
          )}
        </button>

        {/* Divider */}
        {filteredArtists.length > 0 && <div className="h-px bg-gray-100" />}

        {/* Filtered artist options */}
        {filteredArtists.map((artist) => (
          <button
            key={artist.entryKey}
            type="button"
            onClick={() => handleSelectArtist(artist.entryKey)}
            disabled={saving}
            className={`w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors ${
              currentEntryKey === artist.entryKey
                ? 'bg-yellow-50 text-yellow-700'
                : 'hover:bg-gray-50 text-gray-900'
            }`}
          >
            <span className="text-sm font-medium truncate pr-2">{artist.name}</span>
            {currentEntryKey === artist.entryKey && (
              <FontAwesomeIcon icon={faCheck} className="text-yellow-600 text-xs flex-shrink-0" />
            )}
          </button>
        ))}

        {/* No results */}
        {searchQuery && filteredArtists.length === 0 && (
          <div className="px-3 py-3 text-sm text-gray-500 text-center">
            {t('featuredArtistNoResults')}
          </div>
        )}
      </div>,
      document.body
    )
  }

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
      />
      {/* Modal container */}
      <div 
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-4"
      >
        <div
          className="bg-white w-full sm:w-[400px] sm:max-w-[90vw] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 flex-shrink-0 bg-gray-50 rounded-t-2xl sm:rounded-t-xl">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">
              {t('editFeaturedArtist')}
            </h2>
            <button
              onClick={onClose}
              disabled={saving}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label={tCommon('close')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Explanatory text */}
            <p className="text-xs sm:text-sm text-gray-600">
              {t('featuredArtistHelp')}
            </p>

            {/* Searchable dropdown trigger */}
            <div
              ref={triggerRef}
              className={`w-full px-3 py-2.5 bg-white border-2 rounded-xl cursor-pointer transition-all ${
                dropdownOpen 
                  ? 'border-yellow-500 ring-2 ring-yellow-500/20' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={openDropdown}
            >
              {dropdownOpen ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('featuredArtistSearchPlaceholder')}
                  className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
                  autoFocus
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${currentSelection ? 'text-gray-900' : 'text-gray-500'}`}>
                    {currentSelection || t('featuredArtistNone')}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Mobile safe area padding */}
          <div className="pb-[env(safe-area-inset-bottom)] sm:pb-0 flex-shrink-0" />
        </div>
      </div>

      {/* Dropdown rendered via portal */}
      {renderDropdown()}
    </>
  )

  return createPortal(modalContent, document.body)
}

export default function HighlightedGroupFeaturedArtist({
  groupId,
  featuredEntry,
  featuredEntryVS,
  driverArtists,
  isSelf,
  currentEntryKey,
}: HighlightedGroupFeaturedArtistProps) {
  const t = useTranslations('profilePublic')
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [artistImage, setArtistImage] = useState<string | null>(null)

  // Fetch artist image when featured entry changes
  useEffect(() => {
    if (!featuredEntry) {
      setArtistImage(null)
      return
    }
    
    const fetchImage = async () => {
      try {
        const res = await fetch(`/api/images/artist?artist=${encodeURIComponent(featuredEntry.name)}`)
        if (res.ok) {
          const data = await res.json()
          setArtistImage(data.imageUrl || null)
        }
      } catch {
        setArtistImage(null)
      }
    }
    fetchImage()
  }, [featuredEntry])

  const handleSelect = async (entryKey: string | null) => {
    if (entryKey === currentEntryKey) {
      setModalOpen(false)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightedGroupDriverArtistKey: entryKey }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update')
      }
      setModalOpen(false)
      router.refresh()
    } catch {
      setSaving(false)
    } finally {
      setSaving(false)
    }
  }

  const showFeatured = featuredEntry || (isSelf && driverArtists.length > 0)
  if (!showFeatured) return null

  const artistChartUrl = '/groups/' + groupId + '/charts/artist/' + (featuredEntry?.slug ?? '');

  return (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {featuredEntry ? (
            <>
              <Link href={artistChartUrl} className="flex-shrink-0 group/img">
                <div
                  className="relative overflow-hidden rounded-lg transition-transform duration-200 group-hover/img:scale-105"
                  style={{
                    boxShadow: '0 3px 8px -2px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <SafeImage
                    src={artistImage || getDefaultArtistImage()}
                    alt={featuredEntry.name}
                    width={36}
                    height={36}
                    className="w-9 h-9 object-cover"
                  />
                  {/* Subtle shine overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
                    }}
                  />
                </div>
              </Link>
              <div className="flex flex-col min-w-0">
                <Link
                  href={artistChartUrl}
                  className="font-bold truncate text-sm md:text-base hover:opacity-80 transition-opacity leading-tight"
                  style={{ color: 'var(--theme-primary-dark)' }}
                >
                  {featuredEntry.name}
                </Link>
                {featuredEntryVS != null && featuredEntryVS > 0 && (
                  <span
                    className="text-[10px] font-medium opacity-60 whitespace-nowrap leading-tight"
                    style={{ color: 'var(--theme-text)' }}
                  >
                    {t('featuredArtistVS', { value: featuredEntryVS.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-xs font-medium opacity-60 italic" style={{ color: 'var(--theme-text)' }}>
              {t('featuredArtistPlaceholder')}
            </span>
          )}
        </div>
        {isSelf && driverArtists.length > 0 && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={saving}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-black/5 disabled:opacity-50 flex-shrink-0"
            style={{ color: 'var(--theme-text)' }}
            aria-label={t('editFeaturedArtist')}
          >
            <FontAwesomeIcon icon={faPencil} className="text-xs opacity-50" />
          </button>
        )}
      </div>

      <FeaturedArtistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        driverArtists={driverArtists}
        currentEntryKey={currentEntryKey}
        onSelect={handleSelect}
        saving={saving}
      />
    </>
  )
}
