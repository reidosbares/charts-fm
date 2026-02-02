'use client'

import { useState, useRef, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencil } from '@fortawesome/free-solid-svg-icons'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [artistImage, setArtistImage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const handleSelect = async (entryKey: string | null) => {
    setDropdownOpen(false)
    if (entryKey === currentEntryKey) return
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
    <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
        {featuredEntry ? (
          <>
            <Link href={artistChartUrl} className="flex-shrink-0">
              <SafeImage
                src={artistImage || getDefaultArtistImage()}
                alt={featuredEntry.name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover"
              />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={artistChartUrl}
                className="font-bold truncate text-base md:text-lg hover:opacity-90 transition-opacity"
                style={{ color: 'var(--theme-primary-dark)' }}
              >
                {featuredEntry.name}
              </Link>
              {featuredEntryVS != null && featuredEntryVS > 0 && (
                <span className="text-xs opacity-75 whitespace-nowrap" style={{ color: 'var(--theme-text)' }}>
                  {t('featuredArtistVS', { value: featuredEntryVS.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm font-medium opacity-80" style={{ color: 'var(--theme-text)' }}>
            {t('featuredArtistPlaceholder')}
          </span>
        )}
      </div>
      {isSelf && driverArtists.length > 0 && (
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            disabled={saving}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:opacity-70 disabled:opacity-50"
            style={{ color: 'var(--theme-text)' }}
            aria-label={t('editFeaturedArtist')}
          >
            <FontAwesomeIcon icon={faPencil} className="text-sm opacity-60" />
          </button>
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 min-w-[200px] max-h-[280px] overflow-y-auto rounded-xl border shadow-lg py-1"
              style={{ backgroundColor: 'var(--theme-background-to)', borderColor: 'var(--theme-border)' }}
            >
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-black/5 transition-colors first:rounded-t-xl"
                style={{ color: 'var(--theme-text)' }}
              >
                {t('featuredArtistNone')}
              </button>
              {driverArtists.map((artist) => (
                <button
                  key={artist.entryKey}
                  type="button"
                  onClick={() => handleSelect(artist.entryKey)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-black/5 transition-colors truncate ${currentEntryKey === artist.entryKey ? 'opacity-100' : ''}`}
                  style={{ color: 'var(--theme-text)' }}
                >
                  {artist.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
