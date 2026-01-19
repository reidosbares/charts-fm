'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/i18n/routing'
import Toggle from '@/components/Toggle'
import SafeImage from '@/components/SafeImage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash, faSpinner, faSearch } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import Toast from '@/components/Toast'

interface User {
  id: string
  name: string | null
  lastfmUsername: string
  image: string | null
  permissionId: string
}

interface ShoutboxSettingsTabProps {
  groupId: string
}

export default function ShoutboxSettingsTab({ groupId }: ShoutboxSettingsTabProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.shoutbox')
  const [shoutboxEnabled, setShoutboxEnabled] = useState(true)
  const [shoutboxRestrictiveMode, setShoutboxRestrictiveMode] = useState(false)
  const [silencedUsers, setSilencedUsers] = useState<User[]>([])
  const [allowedUsers, setAllowedUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [searchUsername, setSearchUsername] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<{ id: string; name: string | null; lastfmUsername: string } | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [silencingUserId, setSilencingUserId] = useState<string | null>(null)
  const [unsilencingUserId, setUnsilencingUserId] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/settings`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setShoutboxEnabled(data.shoutboxEnabled ?? true)
        setShoutboxRestrictiveMode(data.shoutboxRestrictiveMode ?? false)
        setSilencedUsers(data.silencedUsers || [])
        setAllowedUsers(data.allowedUsers || [])
        setError(null)
      }
    } catch (err) {
      setError(t('failedToLoad'))
      console.error('Error fetching settings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, t])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const searchUser = async () => {
    if (!searchUsername.trim()) return

    setIsSearching(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      const res = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(searchUsername.trim())}`)
      const data = await res.json()
      
      if (data.error) {
        setSearchError(data.error)
      } else if (data.user) {
        setSearchResult(data.user)
      } else {
        setSearchError(t('userNotFound'))
      }
    } catch (err) {
      setSearchError(t('failedToSearch'))
      console.error('Error searching user:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSilence = async (userId: string) => {
    if (silencingUserId) return

    setSilencingUserId(userId)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/silence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('failedToSilence'))
        setSilencingUserId(null)
        return
      }

      await fetchSettings()
      setSearchUsername('')
      setSearchResult(null)
      setSearchError(null)
    } catch (err) {
      setError(t('failedToSilence'))
      console.error('Error silencing user:', err)
    } finally {
      setSilencingUserId(null)
    }
  }

  const handleUnsilence = async (userId: string) => {
    if (unsilencingUserId) return

    setUnsilencingUserId(userId)
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/silence?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('failedToRemoveSilence'))
        setUnsilencingUserId(null)
        return
      }

      await fetchSettings()
    } catch (err) {
      setError(t('failedToRemoveSilence'))
      console.error('Error removing silence:', err)
    } finally {
      setUnsilencingUserId(null)
    }
  }

  const handleAllow = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/allow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('failedToAllow'))
        return
      }

      await fetchSettings()
      setSearchUsername('')
      setSearchResult(null)
      setSearchError(null)
    } catch (err) {
      setError(t('failedToAllow'))
      console.error('Error allowing user:', err)
    }
  }

  const handleRevokeAllow = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/allow?userId=${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('failedToRevoke'))
        return
      }

      await fetchSettings()
    } catch (err) {
      setError(t('failedToRevoke'))
      console.error('Error revoking permission:', err)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/groups/${groupId}/shoutbox/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoutboxEnabled,
          shoutboxRestrictiveMode,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('failedToUpdate'))
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
        <div className="flex justify-center py-6 md:py-8">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl md:text-2xl text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Toast notifications */}
      <Toast
        message={t('updatedSuccessfully')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
      <Toast
        message={error || ''}
        type="error"
        isVisible={!!error}
        onClose={() => setError(null)}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">

      <form onSubmit={handleSave} className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('shoutboxSettings')}
          </label>
          <Toggle
            id="shoutboxEnabled"
            checked={shoutboxEnabled}
            onChange={setShoutboxEnabled}
            disabled={isSaving}
            label={t('enableShoutbox')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('enableShoutboxDescription')}
          </p>
        </div>

        <div>
          <Toggle
            id="shoutboxRestrictiveMode"
            checked={shoutboxRestrictiveMode}
            onChange={setShoutboxRestrictiveMode}
            disabled={isSaving}
            label={t('restrictiveMode')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('restrictiveModeDescription')}
          </p>
        </div>

        {/* Silenced Users */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('silencedUsers')}
          </label>
          <p className="text-xs text-gray-500 mb-3">
            {t('silencedUsersDescription')}
          </p>

          <div className="mb-3 md:mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    searchUser()
                  }
                }}
                placeholder={t('searchByUsername')}
                className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={searchUser}
                disabled={isSearching || !searchUsername.trim()}
                className="px-3 md:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isSearching ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faSearch} />
                )}
              </button>
            </div>
            {searchError && (
              <p className="text-xs text-red-600 mt-1">{searchError}</p>
            )}
            {searchResult && (
              <div className="mt-2 p-2 md:p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <SafeImage
                    src={null}
                    alt={searchResult.name || searchResult.lastfmUsername}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                  />
                  <span className="font-medium text-sm md:text-base truncate">
                    {searchResult.name || searchResult.lastfmUsername}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSilence(searchResult.id)}
                  disabled={silencingUserId === searchResult.id}
                  className="px-2 md:px-3 py-1 text-xs md:text-sm bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 md:gap-2 flex-shrink-0"
                >
                  {silencingUserId === searchResult.id && (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  )}
                  {t('silence')}
                </button>
              </div>
            )}
          </div>

          {silencedUsers.length > 0 ? (
            <div className="space-y-2">
              {silencedUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-2 md:p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <SafeImage
                      src={user.image}
                      alt={user.name || user.lastfmUsername}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                    />
                    <span className="font-medium text-sm md:text-base truncate">
                      {user.name || user.lastfmUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnsilence(user.id)}
                    disabled={unsilencingUserId === user.id}
                    className="p-1.5 md:p-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={t('removeSilence')}
                  >
                    {unsilencingUserId === user.id ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faTrash} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs md:text-sm text-gray-500 italic">{t('noSilencedUsers')}</p>
          )}
        </div>

        {/* Allowed Users (only show in restrictive mode) */}
        {shoutboxRestrictiveMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('allowedUsers')}
            </label>
            <p className="text-xs text-gray-500 mb-3">
              {t('allowedUsersDescription')}
            </p>

            <div className="mb-3 md:mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      searchUser()
                    }
                  }}
                  placeholder={t('searchByUsername')}
                  className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  disabled={isSearching}
                />
                <button
                  type="button"
                  onClick={searchUser}
                  disabled={isSearching || !searchUsername.trim()}
                  className="px-3 md:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSearching ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faSearch} />
                  )}
                </button>
              </div>
              {searchError && (
                <p className="text-xs text-red-600 mt-1">{searchError}</p>
              )}
              {searchResult && (
                <div className="mt-2 p-2 md:p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <SafeImage
                      src={null}
                      alt={searchResult.name || searchResult.lastfmUsername}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                    />
                    <span className="font-medium text-sm md:text-base truncate">
                      {searchResult.name || searchResult.lastfmUsername}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAllow(searchResult.id)}
                    className="px-2 md:px-3 py-1 text-xs md:text-sm bg-yellow-500 text-black rounded font-semibold hover:bg-yellow-400 flex-shrink-0"
                  >
                    {t('allow')}
                  </button>
                </div>
              )}
            </div>

            {allowedUsers.length > 0 ? (
              <div className="space-y-2">
                {allowedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-2 md:p-3 bg-gray-50 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <SafeImage
                        src={user.image}
                        alt={user.name || user.lastfmUsername}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                      />
                      <span className="font-medium text-sm md:text-base truncate">
                        {user.name || user.lastfmUsername}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeAllow(user.id)}
                      className="p-1.5 md:p-2 text-red-600 hover:text-red-800 transition-colors flex-shrink-0"
                      title={t('revokePermission')}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs md:text-sm text-gray-500 italic">{t('noAllowedUsers')}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-3 md:pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? t('saving') : t('saveSettings')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

