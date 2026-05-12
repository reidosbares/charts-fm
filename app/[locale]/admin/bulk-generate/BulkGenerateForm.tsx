'use client'

import { useState } from 'react'

interface CreatedUser {
  id: string
  email: string
  name: string | null
  lastfmUsername: string
  isSuperuser: boolean
  createdAt: string
}

interface CreatedGroup {
  id: string
  name: string
  chartSize: number
  chartMode: string
  trackingDayOfWeek: number
  isPrivate: boolean
  allowFreeJoin: boolean
  dynamicIconEnabled: boolean
  dynamicIconSource: string | null
  colorTheme: string | null
  creator: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  members: Array<{
    user: {
      id: string
      name: string | null
      lastfmUsername: string
    }
  }>
}

export default function BulkGenerateForm() {
  const [lastfmUsernames, setLastfmUsernames] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingRandom, setIsFetchingRandom] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([])
  const [createdGroups, setCreatedGroups] = useState<CreatedGroup[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const handleFetchRandomUsernames = async () => {
    setIsFetchingRandom(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/random-lastfm-usernames?count=20')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch random usernames')
      }

      const fetchedUsernames = data.usernames || []
      if (fetchedUsernames.length === 0) {
        setError('No usernames were fetched. Please try again.')
        return
      }

      // Get existing usernames from textarea
      const existingUsernames = lastfmUsernames
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      // Combine and remove duplicates
      const allUsernames = [...existingUsernames, ...fetchedUsernames]
      const uniqueUsernames = Array.from(new Set(allUsernames))

      // Update textarea with combined usernames
      setLastfmUsernames(uniqueUsernames.join('\n'))
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching usernames')
    } finally {
      setIsFetchingRandom(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setErrors([])
    setIsLoading(true)
    setCreatedUsers([])
    setCreatedGroups([])

    try {
      // Parse usernames from textarea (split by newline)
      const usernames = lastfmUsernames
        .split('\n')
        .map(u => u.trim())
        .filter(u => u.length > 0)

      if (usernames.length === 0) {
        setError('Please enter at least one Last.fm username')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/admin/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastfmUsernames: usernames }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate users and groups')
      }

      setCreatedUsers(data.users || [])
      setCreatedGroups(data.groups || [])
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="bg-[var(--surface-card)] rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="usernames" className="block text-sm font-bold text-[var(--text-secondary)]">
                Last.fm Usernames (one per line)
              </label>
              <button
                type="button"
                onClick={handleFetchRandomUsernames}
                disabled={isLoading || isFetchingRandom}
                className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingRandom ? 'Fetching...' : 'Fetch Random Usernames'}
              </button>
            </div>
            <textarea
              id="usernames"
              value={lastfmUsernames}
              onChange={(e) => setLastfmUsernames(e.target.value)}
              className="w-full h-64 px-4 py-3 bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-strong)] rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-mono text-sm"
              placeholder="Enter Last.fm usernames, one per line:&#10;username1&#10;username2&#10;username3"
              disabled={isLoading}
            />
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              All users will be created with password: <strong>12345</strong>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-200 px-4 py-3 rounded-lg">
              <p className="font-bold mb-2">Warnings:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-sm">{err}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Users & Groups'}
          </button>
        </form>
      </div>

      {createdUsers.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Created Users ({createdUsers.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--border-subtle)]">
              <thead className="bg-[var(--surface-base)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Last.fm Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Password
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface-card)] divide-y divide-[var(--border-subtle)]">
                {createdUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {user.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {user.lastfmUsername}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)] font-mono">
                      12345
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createdGroups.length > 0 && (
        <div className="bg-[var(--surface-card)] rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
            Created Groups ({createdGroups.length})
          </h2>
          <div className="space-y-4">
            {createdGroups.map((group) => (
              <div key={group.id} className="border border-[var(--border-subtle)] rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{group.name}</h3>
                  <div className="flex gap-2">
                    {group.isPrivate && (
                      <span className="px-2 py-1 text-xs font-bold bg-[var(--surface-base)] text-[var(--text-secondary)] rounded">
                        Private
                      </span>
                    )}
                    {group.allowFreeJoin && (
                      <span className="px-2 py-1 text-xs font-bold bg-green-200 text-green-700 rounded">
                        Free Join
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="font-bold text-[var(--text-secondary)]">Chart Size:</span>{' '}
                    <span className="text-[var(--text-secondary)]">{group.chartSize}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-secondary)]">Chart Mode:</span>{' '}
                    <span className="text-[var(--text-secondary)]">{group.chartMode}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-secondary)]">Tracking Day:</span>{' '}
                    <span className="text-[var(--text-secondary)]">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][group.trackingDayOfWeek]}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-secondary)]">Color Theme:</span>{' '}
                    <span className="text-[var(--text-secondary)]">{group.colorTheme || 'white'}</span>
                  </div>
                  {group.dynamicIconEnabled && (
                    <div>
                      <span className="font-bold text-[var(--text-secondary)]">Dynamic Icon:</span>{' '}
                      <span className="text-[var(--text-secondary)]">{group.dynamicIconSource || 'N/A'}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    <span className="font-bold">Creator:</span> {group.creator.lastfmUsername}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-bold">Members ({group.members.length}):</span>{' '}
                    {group.members.map((m, idx) => (
                      <span key={m.user.id}>
                        {m.user.lastfmUsername}
                        {idx < group.members.length - 1 && ', '}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
