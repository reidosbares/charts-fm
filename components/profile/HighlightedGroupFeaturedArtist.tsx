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
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            disabled={saving}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-black/5 disabled:opacity-50"
            style={{ color: 'var(--theme-text)' }}
            aria-label={t('editFeaturedArtist')}
          >
            <FontAwesomeIcon icon={faPencil} className="text-xs opacity-50" />
          </button>
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] max-h-[280px] overflow-y-auto rounded-xl py-1.5 backdrop-blur-xl"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 8px 30px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
              }}
            >
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                  currentEntryKey === null ? 'bg-black/5' : 'hover:bg-black/5'
                }`}
                style={{ color: 'var(--theme-text)' }}
              >
                <span className="opacity-60">{t('featuredArtistNone')}</span>
              </button>
              <div className="h-px bg-black/5 my-1 mx-2.5" />
              {driverArtists.map((artist) => (
                <button
                  key={artist.entryKey}
                  type="button"
                  onClick={() => handleSelect(artist.entryKey)}
                  className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors truncate ${
                    currentEntryKey === artist.entryKey ? 'bg-black/5' : 'hover:bg-black/5'
                  }`}
                  style={{ color: 'var(--theme-text)' }}
                >
                  {artist.name}
                  {currentEntryKey === artist.entryKey && (
                    <span className="ml-1.5 text-[10px] opacity-50">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
