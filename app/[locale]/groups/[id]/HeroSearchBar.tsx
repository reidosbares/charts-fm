'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface HeroSearchBarProps {
  groupId: string
}

export default function HeroSearchBar({ groupId }: HeroSearchBarProps) {
  const t = useSafeTranslations('groups.hero')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = () => {
    if (searchTerm.trim() && !isSearching) {
      setIsSearching(true)
      router.push(`/groups/${groupId}/search?q=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('searchPlaceholder')}
        disabled={isSearching}
        className="
          w-full px-4 py-2.5 md:py-3 pl-10 md:pl-11 pr-4
          rounded-xl
          bg-white/20 backdrop-blur-sm
          border border-white/30
          text-white placeholder-white/60 caret-black
          text-sm md:text-base
          focus:bg-white/30 focus:border-white/50
          focus:outline-none focus:ring-2 focus:ring-white/20
          transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      />
      <FontAwesomeIcon
        icon={isSearching ? faSpinner : faSearch}
        className={`absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 text-gray-800 text-sm md:text-base ${isSearching ? 'animate-spin' : ''}`}
      />
    </div>
  )
}
